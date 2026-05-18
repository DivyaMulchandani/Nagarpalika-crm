import React, { useState, useEffect, useContext } from "react";
import { Card, CardBody, CardHeader, Col, Container, Row } from "reactstrap";
import DataTable from "react-data-table-component";
import { useNavigate } from "react-router-dom";
import { deleteCity, searchCities } from "../../api/locations.api";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import DeleteModal from "../../Components/Common/DeleteModal";
import FormsHeader from "../../Components/Common/FormsModalHeader";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/AuthContext";
import { MenuContext } from "../../context/MenuContext";

const initialState = {
  countryId: "",
  stateId:"",
  stateName: "",
  stateCode:"",
  isActive: true,
};

const City = () => {
  const { adminData } = useContext(AuthContext);
  const { currentPagePermissions } = useContext(MenuContext);
  const navigate = useNavigate();

  const [filter, setFilter] = useState(true);
  const [query, setQuery] = useState("");
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(100);
  const [pageNo, setPageNo] = useState(0);
  const [column, setcolumn] = useState();
  const [sortDirection, setsortDirection] = useState();
  const [remove_id, setRemove_id] = useState("");
  const [modal_delete, setmodal_delete] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);

  useEffect(() => { fetchCities(); }, [pageNo, perPage, column, sortDirection, query, filter]);

  const fetchCities = async () => {
    setLoading(true);
    let skip = (pageNo - 1) * perPage;
    if (skip < 0) skip = 0;
    await searchCities({ skip, per_page: perPage, sorton: column, sortdir: sortDirection, match: query, isActive: filter })
      .then((response) => {
        if (response.data.data.length > 0) {
          setCities(response.data.data[0].data);
          setTotalRows(response.data.data[0].count);
        } else {
          setCities([]);
        }
      });
    setLoading(false);
  };

  const handleDelete = (e) => {
    e.preventDefault();
    setIsDeleteLoading(true);
    deleteCity(remove_id)
      .then(() => { setmodal_delete(false); fetchCities(); toast.success("City Removed Successfully!"); })
      .catch(() => toast.error("Failed to remove city. Please try again."))
      .finally(() => setIsDeleteLoading(false));
  };

  const col = [
    { name: "Sr No", selector: (row, index) => index + 1, maxWidth: "20px" },
    { name: "Country Name", selector: (row) => row.countryName, minWidth: "130px" },
    { name: "State Name", selector: (row) => row.stateName, minWidth: "130px" },
    { name: "City Name", selector: (row) => row.cityName, minWidth: "130px" },
    { name: "City Code", selector: (row) => row.cityCode },
    {
      name: "Action",
      selector: (row) => (
        <div className="d-flex gap-2">
          {currentPagePermissions.read && (
            <button className="btn btn-sm btn-info" onClick={() => navigate(`/city/${row._id}`)}>View</button>
          )}
          {currentPagePermissions.edit && (
            <button className="btn btn-sm btn-success" onClick={() => navigate(`/city/${row._id}/edit`)}>Edit</button>
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

  document.title = `City | ${adminData?.companyName}`;

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <BreadCrumb maintitle="Master" title="City" pageTitle="Master" />
          <Row>
            <Col lg={12}>
              <Card>
                <CardHeader>
                  <FormsHeader
                    formName="City"
                    filter={filter}
                    handleFilter={(e) => setFilter(e.target.checked)}
                    tog_list={() => navigate("/city/add")}
                    setQuery={setQuery}
                    showAddButton={currentPagePermissions.write}
                  />
                </CardHeader>
                <CardBody>
                  <div className="table-responsive table-card mt-1 mb-1">
                    <DataTable
                      columns={col}
                      data={cities}
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

export default City;
