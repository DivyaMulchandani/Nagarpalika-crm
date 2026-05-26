import React, { useState, useCallback, useContext } from "react";
import { Card, CardBody, CardHeader, Col, Container, Row, Badge, Button } from "reactstrap";
import DataTable from "react-data-table-component";
import Select from "react-select";
import { useNavigate } from "react-router-dom";
import { searchNotices, updateNoticeStatus, deleteNotice } from "../../api/notices.api";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/AuthContext";
import { MenuContext } from "../../context/MenuContext";

const TYPE_OPTIONS = [
  { value: "general",     label: "General" },
  { value: "recruitment", label: "Recruitment" },
  { value: "tender",      label: "Tender" },
  { value: "result",      label: "Result" },
];
const STATUS_OPTIONS = [
  { value: "draft",       label: "Draft" },
  { value: "published",   label: "Published" },
  { value: "unpublished", label: "Unpublished" },
];
const typeColor  = { general: "info", recruitment: "primary", tender: "warning", result: "success" };
const statusColor = { draft: "secondary", published: "success", unpublished: "danger" };

const NoticeList = () => {
  const { adminData } = useContext(AuthContext);
  const { currentPagePermissions } = useContext(MenuContext);
  const navigate = useNavigate();

  const [data, setData]         = useState([]);
  const [loading, setLoading]   = useState(false);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage]   = useState(20);
  const [pageNo, setPageNo]     = useState(1);
  const [typeFilter, setTypeFilter]     = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);
  const [search, setSearch]     = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await searchNotices({
        skip: (pageNo - 1) * perPage,
        per_page: perPage,
        type: typeFilter?.value || undefined,
        status: statusFilter?.value || undefined,
        search: search || undefined,
      });
      const rows = res.data.data?.[0];
      setData(rows?.data || []);
      setTotalRows(rows?.count || 0);
    } catch { setData([]); }
    setLoading(false);
  }, [pageNo, perPage, typeFilter, statusFilter, search]);

  React.useEffect(() => { fetchData(); }, [fetchData]);

  const toggleStatus = async (row) => {
    const next = row.status === "published" ? "unpublished" : "published";
    try {
      await updateNoticeStatus(row._id, next);
      toast.success(`Notice ${next}`);
      fetchData();
    } catch { toast.error("Status update failed"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Archive this notice?")) return;
    try {
      await deleteNotice(id);
      toast.success("Notice archived");
      fetchData();
    } catch { toast.error("Delete failed"); }
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN") : "—";

  const columns = [
    {
      name: "Title",
      selector: (r) => r.title,
      grow: 3,
      cell: (r) => (
        <span>
          {r.is_important_instruction && <Badge color="danger" className="me-1" style={{ fontSize: 10 }}>Important</Badge>}
          {r.title}
        </span>
      ),
    },
    {
      name: "Type",
      cell: (r) => <Badge color={typeColor[r.type] || "secondary"}>{r.type}</Badge>,
      width: "120px", center: true,
    },
    { name: "Publish Date", selector: (r) => fmtDate(r.publish_date), width: "130px" },
    { name: "Expiry Date",  selector: (r) => fmtDate(r.expiry_date),  width: "130px" },
    {
      name: "Status",
      cell: (r) => <Badge color={statusColor[r.status] || "secondary"}>{r.status}</Badge>,
      width: "110px", center: true,
    },
    {
      name: "Actions",
      cell: (r) => (
        <div className="d-flex gap-1">
          {currentPagePermissions.edit && (
            <button
              className={`btn btn-sm ${r.status === "published" ? "btn-outline-warning" : "btn-outline-success"}`}
              onClick={() => toggleStatus(r)}
            >
              {r.status === "published" ? "Unpublish" : "Publish"}
            </button>
          )}
          {currentPagePermissions.edit && (
            <button className="btn btn-sm btn-primary" onClick={() => navigate(`/notices/${r._id}/edit`)}>Edit</button>
          )}
          {currentPagePermissions.delete && (
            <button className="btn btn-sm btn-danger" onClick={() => handleDelete(r._id)}>Del</button>
          )}
        </div>
      ),
      width: "220px",
    },
  ];

  document.title = `Notice Board | ${adminData?.companyName}`;

  return (
    <div className="page-content">
      <Container fluid>
        <BreadCrumb maintitle="Recruitment" title="Notice Board" pageTitle="Recruitment" />
        <Row><Col lg={12}>
          <Card>
            <CardHeader>
              <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between">
                <div className="d-flex flex-wrap gap-2 align-items-center">
                  <div style={{ width: 160 }}>
                    <Select options={TYPE_OPTIONS} value={typeFilter} onChange={(v) => { setTypeFilter(v); setPageNo(1); }} placeholder="Type" isClearable isSearchable />
                  </div>
                  <div style={{ width: 160 }}>
                    <Select options={STATUS_OPTIONS} value={statusFilter} onChange={(v) => { setStatusFilter(v); setPageNo(1); }} placeholder="Status" isClearable isSearchable />
                  </div>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    style={{ width: 200 }}
                    placeholder="Search title..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPageNo(1); }}
                  />
                </div>
                {currentPagePermissions.write && (
                  <Button color="primary" size="sm" onClick={() => navigate("/notices/new")}>
                    <i className="ri-add-line me-1"></i>New Notice
                  </Button>
                )}
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
        </Col></Row>
      </Container>
    </div>
  );
};

export default NoticeList;
