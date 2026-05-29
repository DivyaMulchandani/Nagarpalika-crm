import React, { useState, useEffect, useContext, useCallback } from "react";
import { Card, CardBody, CardHeader, Col, Container, Row, Badge, Button } from "reactstrap";
import DataTable from "react-data-table-component";
import Select from "react-select";
import { useNavigate } from "react-router-dom";
import { searchAdvertisements, deleteAdvertisement } from "../../api/advertisements.api";
import { getAllDepartments } from "../../api/departments.api";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import DeleteModal from "../../Components/Common/DeleteModal";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/AuthContext";
import { MenuContext } from "../../context/MenuContext";

const STATUS_OPTIONS = [
  { value: "Draft", label: "Draft" },
  { value: "Published", label: "Published" },
  { value: "Closed", label: "Closed" },
  { value: "Archived", label: "Archived" },
];

const statusColor = { Draft: "secondary", Published: "success", Closed: "warning", Archived: "dark" };

const AdvertisementList = () => {
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
  const [statusFilter, setStatusFilter] = useState(null);
  const [deptFilter, setDeptFilter] = useState(null);
  const [deptOptions, setDeptOptions] = useState([]);
  const [deleteId, setDeleteId] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    getAllDepartments()
      .then((r) => setDeptOptions((r.data.data || []).map((d) => ({ value: d._id, label: d.departmentName }))))
      .catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await searchAdvertisements({
        skip: (pageNo - 1) * perPage,
        per_page: perPage,
        sorton: column,
        sortdir: sortDir,
        match: query || undefined,
        status: statusFilter?.value || undefined,
        department: deptFilter?.value || undefined,
      });
      const rows = res.data.data?.[0];
      setData(rows?.data || []);
      setTotalRows(rows?.count || 0);
    } catch {
      setData([]);
    }
    setLoading(false);
  }, [pageNo, perPage, column, sortDir, query, statusFilter, deptFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = () => {
    setDeleteLoading(true);
    deleteAdvertisement(deleteId)
      .then(() => { toast.success("Advertisement archived"); setShowDelete(false); fetchData(); })
      .catch(() => toast.error("Could not archive advertisement"))
      .finally(() => setDeleteLoading(false));
  };

  const columns = [
    { name: "Advt No", selector: (r) => r.advt_no, sortField: "advt_no", sortable: true, width: "130px" },
    {
      name: "Post Title",
      cell: (r) => (
        <div>
          <div>{r.post_title?.en}</div>
          {r.post_title?.gu && <div style={{ fontSize: 11, color: "#888" }}>{r.post_title.gu}</div>}
        </div>
      ),
      grow: 2,
    },
    { name: "Dept", selector: (r) => r.department?.departmentName || "—", width: "140px" },
    { name: "Class", selector: (r) => r.class || "—", width: "80px", center: true },
    {
      name: "Status",
      cell: (r) => <Badge color={statusColor[r.status] || "secondary"}>{r.status}</Badge>,
      width: "100px",
      center: true,
    },
    {
      name: "Last Date",
      selector: (r) => r.end_date ? new Date(r.end_date).toLocaleDateString("en-IN") : "—",
      width: "110px",
    },
    { name: "Fee (₹)", selector: (r) => r.application_fee ?? "—", width: "90px", right: true },
    {
      name: "Actions",
      cell: (r) => (
        <div className="d-flex gap-1 flex-wrap">
          {currentPagePermissions.read && (
            <button className="btn btn-sm btn-info" onClick={() => navigate(`/advertisements/${r._id}`)}>View</button>
          )}
          {currentPagePermissions.edit && (
            <button className="btn btn-sm btn-success" onClick={() => navigate(`/advertisements/${r._id}/edit`)}>Edit</button>
          )}
          {currentPagePermissions.delete && r.status !== "Archived" && (
            <button className="btn btn-sm btn-danger" onClick={() => { setDeleteId(r._id); setShowDelete(true); }}>Archive</button>
          )}
        </div>
      ),
      width: "230px",
    },
  ];

  document.title = `Advertisements | ${adminData?.companyName}`;

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <BreadCrumb maintitle="Recruitment" title="Advertisements" pageTitle="Recruitment" />
          <Row>
            <Col lg={12}>
              <Card>
                <CardHeader>
                  <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between">
                    <div className="d-flex flex-wrap gap-2 align-items-center">
                      <input
                        className="form-control form-control-sm"
                        style={{ width: 220 }}
                        placeholder="Search advt no / title..."
                        value={query}
                        onChange={(e) => { setQuery(e.target.value); setPageNo(1); }}
                      />
                      <div style={{ width: 180 }}>
                        <Select options={deptOptions} value={deptFilter} onChange={(v) => { setDeptFilter(v); setPageNo(1); }} placeholder="Department" isClearable isSearchable />
                      </div>
                      <div style={{ width: 160 }}>
                        <Select options={STATUS_OPTIONS} value={statusFilter} onChange={(v) => { setStatusFilter(v); setPageNo(1); }} placeholder="Status" isClearable isSearchable />
                      </div>
                    </div>
                    {currentPagePermissions.write && (
                      <Button color="success" size="sm" onClick={() => navigate("/advertisements/add")}>
                        <i className="ri-add-line me-1"></i>New Advertisement
                      </Button>
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
      <DeleteModal show={showDelete} toggle={() => setShowDelete(false)} setmodal_delete={setShowDelete} handleDelete={handleDelete} disabled={deleteLoading} />
    </React.Fragment>
  );
};

export default AdvertisementList;
