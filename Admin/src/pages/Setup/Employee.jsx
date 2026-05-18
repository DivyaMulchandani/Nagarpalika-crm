import React, { useState, useEffect, useContext, useCallback } from "react";
import { Card, CardBody, CardHeader, Col, Container, Row } from "reactstrap";
import DataTable from "react-data-table-component";
import { useNavigate } from "react-router-dom";
import { deleteEmployee, searchEmployees } from "../../api/employees.api";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import DeleteModal from "../../Components/Common/DeleteModal";
import FormsHeader from "../../Components/Common/FormsModalHeader";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/AuthContext";
import { MenuContext } from "../../context/MenuContext";

const Employee = () => {
  const { adminData } = useContext(AuthContext);
  const { currentPagePermissions } = useContext(MenuContext);
  const navigate = useNavigate();

  const [filter, setFilter] = useState(true);
  const [query, setQuery] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(100);
  const [pageNo, setPageNo] = useState(0);
  const [column, setcolumn] = useState();
  const [sortDirection, setsortDirection] = useState();
  const [remove_id, setRemove_id] = useState("");
  const [modal_delete, setmodal_delete] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    let skip = (pageNo - 1) * perPage;
    if (skip < 0) skip = 0;
    try {
      const response = await searchEmployees({
        skip,
        per_page: perPage,
        sorton: column,
        sortdir: sortDirection,
        match: query,
        isActive: filter,
        branchId: adminData.branchId ? adminData.branchId._id : null,
      });
      if (response.data.data.length > 0) {
        setData(response.data.data[0].data);
        setTotalRows(response.data.data[0].count);
      } else {
        setData([]);
      }
    } catch {
      setData([]);
    }
    setLoading(false);
  }, [pageNo, perPage, column, sortDirection, query, filter, adminData.branchId]);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  const handleDelete = (e) => {
    e.preventDefault();
    setIsDeleteLoading(true);
    deleteEmployee(remove_id)
      .then(() => { setmodal_delete(false); fetchEmployees(); toast.success("Employee Deleted Successfully"); })
      .catch(() => toast.error("Cannot delete Employee"))
      .finally(() => setIsDeleteLoading(false));
  };

  const columns = [
    { name: "Sr No", selector: (row, index) => index + 1, maxWidth: "20px" },
    { name: "Employee Name", selector: (row) => <p className="text-wrap">{row.employeeName}</p>, maxWidth: "200px" },
    { name: "Department", selector: (row) => <p className="text-wrap">{row.department?.departmentName || row.departmentId?.departmentName || ""}</p>, maxWidth: "200px" },
    { name: "Email", selector: (row) => <p className="text-wrap">{row.emailOffice}</p>, maxWidth: "250px" },
    { name: "Phone", selector: (row) => row.mobileNumber, maxWidth: "150px" },
    {
      name: "Action",
      selector: (row) => (
        <div className="d-flex gap-2">
          {currentPagePermissions.read && (
            <button className="btn btn-sm btn-info" onClick={() => navigate(`/employee/${row._id}`)}>View</button>
          )}
          {currentPagePermissions.edit && (
            <button className="btn btn-sm btn-success" onClick={() => navigate(`/employee/${row._id}/edit`)}>Edit</button>
          )}
          {currentPagePermissions.delete && (
            <button className="btn btn-sm btn-danger" onClick={() => { setmodal_delete(true); setRemove_id(row._id); }}>Remove</button>
          )}
          {!currentPagePermissions.read && !currentPagePermissions.edit && !currentPagePermissions.delete && (
            <span className="text-muted">No actions available</span>
          )}
        </div>
      ),
      minWidth: "220px",
    },
  ];

  document.title = `Employee | ${adminData?.companyName}`;

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <BreadCrumb maintitle="Setup" title="Employee" pageTitle="Setup" />
          <Row>
            <Col lg={12}>
              <Card>
                <CardHeader>
                  <FormsHeader
                    formName="Employee"
                    filter={filter}
                    handleFilter={(e) => { setPageNo(1); setFilter(e.target.checked); }}
                    tog_list={() => navigate("/employee/add")}
                    setQuery={setQuery}
                    showAddButton={currentPagePermissions.write}
                  />
                </CardHeader>
                <CardBody>
                  <div className="table-responsive table-card mt-1 mb-1">
                    <DataTable
                      columns={columns}
                      data={data}
                      progressPending={loading}
                      sortServer
                      onSort={(col, dir) => { setcolumn(col.sortField); setsortDirection(dir); }}
                      pagination
                      paginationServer
                      paginationTotalRows={totalRows}
                      paginationPerPage={100}
                      paginationRowsPerPageOptions={[50, 100, 200, 300, totalRows]}
                      onChangeRowsPerPage={(n) => setPerPage(n)}
                      onChangePage={(p) => setPageNo(p)}
                    />
                  </div>
                </CardBody>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>
      <DeleteModal
        show={modal_delete}
        handleDelete={handleDelete}
        toggle={() => setmodal_delete(false)}
        setmodal_delete={setmodal_delete}
        disabled={isDeleteLoading}
      />
    </React.Fragment>
  );
};

export default Employee;
