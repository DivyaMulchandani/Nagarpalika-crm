import React, { useState, useCallback, useContext } from "react";
import { Card, CardBody, CardHeader, Col, Container, Row, Badge, Button } from "reactstrap";
import DataTable from "react-data-table-component";
import Select from "react-select";
import { useNavigate } from "react-router-dom";
import { searchCandidates, exportCandidates, exportCandidatesZip } from "../../api/candidates.api";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import { saveBlobResponse, parseBlobError } from "../../utils/downloadBlob";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/AuthContext";
import { MenuContext } from "../../context/MenuContext";

const OTR_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "complete", label: "Complete" },
];
const otrColor = { pending: "warning", complete: "success" };

const CandidateList = () => {
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
  const [otrFilter, setOtrFilter] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await searchCandidates({
        skip: (pageNo - 1) * perPage,
        per_page: perPage,
        sorton: column,
        sortdir: sortDir,
        match: query || undefined,
        otr_status: otrFilter?.value || undefined,
      });
      const rows = res.data.data?.[0];
      setData(rows?.data || []);
      setTotalRows(rows?.count || 0);
    } catch {
      setData([]);
    }
    setLoading(false);
  }, [pageNo, perPage, column, sortDir, query, otrFilter]);

  React.useEffect(() => { fetchData(); }, [fetchData]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await exportCandidates({ match: query || undefined, otr_status: otrFilter?.value });
      await saveBlobResponse(res, "candidates-export.csv");
      toast.success("Candidates exported");
    } catch (err) {
      toast.error(await parseBlobError(err, "Export failed"));
    } finally {
      setExporting(false);
    }
  };

  // Downloads a ZIP of exactly the candidates on the current page — same
  // skip/per_page/sort/filter as the table, so the archive mirrors the view.
  const handleDownloadZip = async () => {
    if (!totalRows) {
      toast.info("No candidates to download");
      return;
    }
    setDownloadingZip(true);
    try {
      const res = await exportCandidatesZip({
        skip: (pageNo - 1) * perPage,
        per_page: perPage,
        sorton: column,
        sortdir: sortDir,
        match: query || undefined,
        otr_status: otrFilter?.value || undefined,
      });
      const filename = await saveBlobResponse(res, "candidates.zip");
      toast.success(`Downloaded ${filename}`);
    } catch (err) {
      toast.error(await parseBlobError(err, "ZIP download failed"));
    } finally {
      setDownloadingZip(false);
    }
  };

  const columns = [
    { name: "Reg ID", selector: (r) => r.registration_id, sortField: "registration_id", sortable: true, width: "160px" },
    { name: "Name", selector: (r) => r.name, sortField: "name", sortable: true, grow: 2 },
    { name: "Category", selector: (r) => r.category || "—", width: "110px" },
    { name: "Mobile", selector: (r) => r.mobile, width: "130px" },
    {
      name: "OTR Status",
      cell: (r) => <Badge color={otrColor[r.otr_status] || "secondary"}>{r.otr_status}</Badge>,
      width: "120px",
      center: true,
    },
    { name: "Registered At", selector: (r) => new Date(r.createdAt).toLocaleDateString("en-IN"), width: "130px" },
    {
      name: "Actions",
      cell: (r) => currentPagePermissions.read
        ? <button className="btn btn-sm btn-info" onClick={() => navigate(`/candidates/${r._id}`)}>View</button>
        : null,
      width: "100px",
    },
  ];

  document.title = `Candidates | ${adminData?.companyName}`;

  return (
    <div className="page-content">
      <Container fluid>
        <BreadCrumb maintitle="Recruitment" title="Candidates" pageTitle="Recruitment" />
        <Row>
          <Col lg={12}>
            <Card>
              <CardHeader>
                <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between">
                  <div className="d-flex flex-wrap gap-2 align-items-center">
                    <input
                      className="form-control form-control-sm"
                      style={{ width: 240 }}
                      placeholder="Search reg ID / name / mobile..."
                      value={query}
                      onChange={(e) => { setQuery(e.target.value); setPageNo(1); }}
                    />
                    <div style={{ width: 160 }}>
                      <Select options={OTR_OPTIONS} value={otrFilter} onChange={(v) => { setOtrFilter(v); setPageNo(1); }} placeholder="OTR Status" isClearable isSearchable />
                    </div>
                  </div>
                  {currentPagePermissions.write && (
                    <div className="d-flex gap-2">
                      <Button color="outline-primary" size="sm" onClick={handleExport} disabled={exporting || downloadingZip}>
                        {exporting ? <span className="spinner-border spinner-border-sm me-1"></span> : <i className="ri-download-2-line me-1"></i>}
                        Export
                      </Button>
                      <Button color="outline-success" size="sm" onClick={handleDownloadZip} disabled={downloadingZip || exporting}>
                        {downloadingZip ? <span className="spinner-border spinner-border-sm me-1"></span> : <i className="ri-folder-zip-line me-1"></i>}
                        {downloadingZip ? "Preparing ZIP…" : "Download ZIP"}
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardBody>
                <DataTable
                  columns={columns}
                  data={data}
                  progressPending={loading}
                  sortServer
                  onSort={(col, dir) => { setColumn(col.sortField); setSortDir(dir); }}
                  pagination
                  paginationServer
                  paginationTotalRows={totalRows}
                  paginationPerPage={perPage}
                  paginationRowsPerPageOptions={[10, 20, 50, 100]}
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

export default CandidateList;
