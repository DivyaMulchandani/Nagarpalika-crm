import React, { useState, useCallback, useContext } from "react";
import { Card, CardBody, CardHeader, Col, Container, Row, Badge } from "reactstrap";
import DataTable from "react-data-table-component";
import Select from "react-select";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/AuthContext";
import { MenuContext } from "../../context/MenuContext";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import api from "../../api/index";
import { ENDPOINTS } from "../../api/endpoints";

const STATUS_OPTIONS = [
  { value: "open",     label: "Open" },
  { value: "resolved", label: "Resolved" },
];

const CATEGORY_OPTIONS = [
  { value: "General Query",       label: "General Query" },
  { value: "Recruitment / OJAS",  label: "Recruitment / OJAS" },
  { value: "Building Permission", label: "Building Permission" },
  { value: "Property Tax",        label: "Property Tax" },
  { value: "Public Grievance",    label: "Public Grievance" },
  { value: "RTI Query",           label: "RTI Query" },
];

const statusColor = { open: "warning", resolved: "success" };

const HelpQueryList = () => {
  const { adminData } = useContext(AuthContext);
  const { currentPagePermissions } = useContext(MenuContext);

  const [data, setData]           = useState([]);
  const [loading, setLoading]     = useState(false);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage]     = useState(20);
  const [pageNo, setPageNo]       = useState(1);
  const [statusFilter, setStatusFilter]     = useState(null);
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [search, setSearch]       = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        skip: (pageNo - 1) * perPage,
        per_page: perPage,
        ...(statusFilter   ? { status: statusFilter.value }     : {}),
        ...(categoryFilter ? { category: categoryFilter.value } : {}),
        ...(search         ? { search }                         : {}),
      };
      const res = await api.get(ENDPOINTS.HELP_QUERIES.BASE, { params });
      setData(res.data.data?.data || []);
      setTotalRows(res.data.data?.total || 0);
    } catch {
      setData([]);
    }
    setLoading(false);
  }, [pageNo, perPage, statusFilter, categoryFilter, search]);

  React.useEffect(() => { fetchData(); }, [fetchData]);

  const toggleStatus = async (row) => {
    const next = row.status === "open" ? "resolved" : "open";
    try {
      await api.patch(ENDPOINTS.HELP_QUERIES.STATUS(row._id), { status: next });
      toast.success(`Marked as ${next}`);
      fetchData();
    } catch {
      toast.error("Status update failed");
    }
  };

  const fmtDate = (d) =>
    d ? new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";

  const columns = [
    { name: "Name", selector: (r) => r.name, grow: 1 },
    {
      name: "Contact",
      cell: (r) => (
        <div style={{ fontSize: 12 }}>
          {r.mobile && <div>{r.mobile}</div>}
          {r.email  && <div style={{ color: "var(--bs-secondary)" }}>{r.email}</div>}
        </div>
      ),
      grow: 1,
    },
    { name: "Category", selector: (r) => r.category || "—", width: "160px" },
    {
      name: "Subject / Message",
      cell: (r) => (
        <div style={{ fontSize: 12 }}>
          {r.subject && <div style={{ fontWeight: 500 }}>{r.subject}</div>}
          <div style={{ color: "var(--bs-secondary)" }}>
            {r.message?.slice(0, 120)}{r.message?.length > 120 ? "…" : ""}
          </div>
        </div>
      ),
      grow: 3,
    },
    {
      name: "Status",
      cell: (r) => <Badge color={statusColor[r.status] || "secondary"}>{r.status}</Badge>,
      width: "100px",
      center: true,
    },
    { name: "Submitted", selector: (r) => fmtDate(r.createdAt), width: "160px" },
    {
      name: "Action",
      cell: (r) =>
        currentPagePermissions?.edit ? (
          <button
            className={`btn btn-sm ${r.status === "open" ? "btn-outline-success" : "btn-outline-warning"}`}
            onClick={() => toggleStatus(r)}
          >
            {r.status === "open" ? "Resolve" : "Reopen"}
          </button>
        ) : null,
      width: "110px",
      center: true,
    },
  ];

  document.title = `Help Queries | ${adminData?.companyName || "Admin"}`;

  return (
    <div className="page-content">
      <Container fluid>
        <BreadCrumb maintitle="Support" title="Help Queries" pageTitle="Support" />
        <Row>
          <Col lg={12}>
            <Card>
              <CardHeader>
                <div className="d-flex flex-wrap gap-2 align-items-center">
                  <div style={{ width: 150 }}>
                    <Select
                      options={STATUS_OPTIONS}
                      value={statusFilter}
                      onChange={(v) => { setStatusFilter(v); setPageNo(1); }}
                      placeholder="Status"
                      isClearable
                    />
                  </div>
                  <div style={{ width: 190 }}>
                    <Select
                      options={CATEGORY_OPTIONS}
                      value={categoryFilter}
                      onChange={(v) => { setCategoryFilter(v); setPageNo(1); }}
                      placeholder="Category"
                      isClearable
                    />
                  </div>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    style={{ width: 220 }}
                    placeholder="Search name, email, mobile…"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPageNo(1); }}
                  />
                </div>
              </CardHeader>
              <CardBody>
                <DataTable
                  columns={columns}
                  data={data}
                  progressPending={loading}
                  pagination
                  paginationServer
                  paginationTotalRows={totalRows}
                  paginationPerPage={perPage}
                  paginationRowsPerPageOptions={[10, 20, 50]}
                  onChangeRowsPerPage={(n) => { setPerPage(n); setPageNo(1); }}
                  onChangePage={(p) => setPageNo(p)}
                />
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default HelpQueryList;
