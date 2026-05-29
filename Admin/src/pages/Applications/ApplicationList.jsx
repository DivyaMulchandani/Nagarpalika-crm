import React, { useState, useCallback, useContext } from "react";
import { Card, CardBody, CardHeader, Col, Container, Row, Badge, Button } from "reactstrap";
import DataTable from "react-data-table-component";
import Select from "react-select";
import { useNavigate } from "react-router-dom";
import { searchApplications, exportApplications } from "../../api/applications.api";
import { getAllAdvertisements } from "../../api/advertisements.api";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/AuthContext";
import { MenuContext } from "../../context/MenuContext";

const FEE_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "paid",    label: "Paid" },
];
const feeColor   = { pending: "warning", paid: "success" };
const appColor   = { submitted: "primary", under_review: "info", selected: "success", rejected: "danger" };

const ApplicationList = () => {
  const { adminData } = useContext(AuthContext);
  const { currentPagePermissions } = useContext(MenuContext);
  const navigate = useNavigate();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(20);
  const [pageNo, setPageNo] = useState(1);
  const [column, setColumn] = useState();
  const [sortDir, setSortDir] = useState();
  const [query, setQuery] = useState("");
  const [advtFilter, setAdvtFilter] = useState(null);
  const [feeFilter, setFeeFilter] = useState(null);
  const [advtOptions, setAdvtOptions] = useState([]);
  const [exporting, setExporting] = useState(false);

  React.useEffect(() => {
    getAllAdvertisements()
      .then((r) => setAdvtOptions((r.data.data || []).map((a) => ({ value: a.advt_no, label: `${a.advt_no} — ${a.post_title?.en || ""}` }))))
      .catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await searchApplications({
        skip: (pageNo - 1) * perPage,
        per_page: perPage,
        sorton: column,
        sortdir: sortDir,
        match: query || undefined,
        advt_no: advtFilter?.value || undefined,
      });
      const rows = res.data.data?.[0];
      setData(rows?.data || []);
      setTotalRows(rows?.count || 0);
    } catch {
      setData([]);
    }
    setLoading(false);
  }, [pageNo, perPage, column, sortDir, query, advtFilter, feeFilter]);

  React.useEffect(() => { fetchData(); }, [fetchData]);

  const columns = [
    { name: "App Ref No", selector: (r) => r.application_ref_no, sortField: "application_ref_no", sortable: true, width: "170px" },
    { name: "Reg ID", selector: (r) => r.registration_id, width: "150px" },
    { name: "Advt No", selector: (r) => r.advt_no, width: "130px" },
    {
      name: "Status",
      cell: (r) => <Badge color={appColor[r.status] || "secondary"}>{r.status}</Badge>,
      width: "120px",
      center: true,
    },
    { name: "Submitted At", selector: (r) => new Date(r.submitted_at || r.createdAt).toLocaleDateString("en-IN"), width: "130px" },
    {
      name: "Actions",
      cell: (r) => currentPagePermissions.read
        ? <button className="btn btn-sm btn-info" onClick={() => navigate(`/applications/${r.application_ref_no}`)}>View</button>
        : null,
      width: "100px",
    },
  ];

  document.title = `Applications | ${adminData?.companyName}`;

  return (
    <div className="page-content">
      <Container fluid>
        <BreadCrumb maintitle="Recruitment" title="Applications" pageTitle="Recruitment" />
        <Row><Col lg={12}>
          <Card>
            <CardHeader>
              <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between">
                <div className="d-flex flex-wrap gap-2 align-items-center">
                  <input className="form-control form-control-sm" style={{ width: 220 }} placeholder="Search ref no / reg ID..." value={query} onChange={(e) => { setQuery(e.target.value); setPageNo(1); }} />
                  <div style={{ width: 260 }}>
                    <Select options={advtOptions} value={advtFilter} onChange={(v) => { setAdvtFilter(v); setPageNo(1); }} placeholder="Advertisement" isClearable isSearchable />
                  </div>
                  <div style={{ width: 150 }}>
                    <Select options={FEE_STATUS_OPTIONS} value={feeFilter} onChange={(v) => { setFeeFilter(v); setPageNo(1); }} placeholder="Fee Status" isClearable isSearchable />
                  </div>
                </div>
                {currentPagePermissions.write && (
                  <Button color="outline-primary" size="sm" onClick={() => { setExporting(true); exportApplications({ advt_no: advtFilter?.value }).then(() => toast.success("Export initiated")).catch(() => toast.error("Export failed")).finally(() => setExporting(false)); }} disabled={exporting}>
                    {exporting ? <span className="spinner-border spinner-border-sm me-1"></span> : <i className="ri-download-2-line me-1"></i>}Export
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardBody>
              <DataTable columns={columns} data={data} progressPending={loading} sortServer onSort={(col, dir) => { setColumn(col.sortField); setSortDir(dir); }} pagination paginationServer paginationTotalRows={totalRows} paginationPerPage={perPage} paginationRowsPerPageOptions={[10, 20, 50, 100]} onChangeRowsPerPage={(n) => { setPerPage(n); setPageNo(1); }} onChangePage={(p) => setPageNo(p)} />
            </CardBody>
          </Card>
        </Col></Row>
      </Container>
    </div>
  );
};

export default ApplicationList;
