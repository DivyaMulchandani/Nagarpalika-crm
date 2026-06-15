import React, { useState, useEffect, useContext } from "react";
import { Card, CardBody, CardHeader, Col, Container, Row } from "reactstrap";
import DataTable from "react-data-table-component";
import { useNavigate } from "react-router-dom";
import { searchQualifications, deleteQualification } from "../../api/qualifications.api";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import DeleteModal from "../../Components/Common/DeleteModal";
import FormsHeader from "../../Components/Common/FormsModalHeader";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/AuthContext";
import { MenuContext } from "../../context/MenuContext";

const Qualification = () => {
  const { adminData } = useContext(AuthContext);
  const { currentPagePermissions } = useContext(MenuContext);
  const navigate = useNavigate();

  const [filter, setFilter] = useState(true);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(100);
  const [pageNo, setPageNo] = useState(0);
  const [column, setColumn] = useState();
  const [sortDirection, setSortDirection] = useState();
  const [removeId, setRemoveId] = useState("");
  const [modalDelete, setModalDelete] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);

  useEffect(() => { fetchItems(); }, [pageNo, perPage, column, sortDirection, query, filter]);

  const fetchItems = async () => {
    setLoading(true);
    let skip = (pageNo - 1) * perPage;
    if (skip < 0) skip = 0;
    await searchQualifications({ skip, per_page: perPage, sorton: column, sortdir: sortDirection, match: query, isActive: filter })
      .then((res) => {
        if (res.data.data.length > 0) {
          setItems(res.data.data[0].data);
          setTotalRows(res.data.data[0].count);
        } else {
          setItems([]);
        }
      });
    setLoading(false);
  };

  const handleDelete = (e) => {
    e.preventDefault();
    setIsDeleteLoading(true);
    deleteQualification(removeId)
      .then(() => { setModalDelete(false); fetchItems(); toast.success("Qualification removed successfully!"); })
      .catch(() => toast.error("Failed to remove qualification. Please try again."))
      .finally(() => setIsDeleteLoading(false));
  };

  const col = [
    { name: "Sr No", selector: (_, index) => index + 1, maxWidth: "60px" },
    { name: "Name", selector: (row) => row.name, sortable: true, sortField: "name" },
    { name: "Status", selector: (row) => row.isActive ? "Active" : "Inactive", maxWidth: "100px" },
    {
      name: "Action",
      selector: (row) => (
        <div className="d-flex gap-2">
          {currentPagePermissions.read && (
            <button className="btn btn-sm btn-info" onClick={() => navigate(`/qualification/${row._id}`)}>View</button>
          )}
          {currentPagePermissions.edit && (
            <button className="btn btn-sm btn-success" onClick={() => navigate(`/qualification/${row._id}/edit`)}>Edit</button>
          )}
          {currentPagePermissions.delete && (
            <button className="btn btn-sm btn-danger" onClick={() => { setModalDelete(true); setRemoveId(row._id); }}>Remove</button>
          )}
          {!currentPagePermissions.read && !currentPagePermissions.edit && !currentPagePermissions.delete && (
            <span className="text-muted">No actions available</span>
          )}
        </div>
      ),
      minWidth: "220px",
    },
  ];

  document.title = `Qualification | ${adminData?.companyName}`;

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <BreadCrumb maintitle="Master" title="Qualification" pageTitle="Master" />
          <Row>
            <Col lg={12}>
              <Card>
                <CardHeader>
                  <FormsHeader
                    formName="Qualification"
                    filter={filter}
                    handleFilter={(e) => setFilter(e.target.checked)}
                    tog_list={() => navigate("/qualification/add")}
                    setQuery={setQuery}
                    showAddButton={currentPagePermissions.write}
                  />
                </CardHeader>
                <CardBody>
                  <div className="table-responsive table-card mt-1 mb-1">
                    <DataTable
                      columns={col}
                      data={items}
                      progressPending={loading}
                      sortServer
                      onSort={(c, dir) => { setColumn(c.sortField); setSortDirection(dir); }}
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
        show={modalDelete}
        handleDelete={handleDelete}
        toggle={() => setModalDelete(false)}
        setmodal_delete={setModalDelete}
        disabled={isDeleteLoading}
      />
    </React.Fragment>
  );
};

export default Qualification;
