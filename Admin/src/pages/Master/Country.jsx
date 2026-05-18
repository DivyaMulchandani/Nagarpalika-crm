import React, { useState, useEffect, useContext } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Col,
  Container,
  Row,
} from "reactstrap";
import DataTable from "react-data-table-component";
import { useNavigate } from "react-router-dom";
import { deleteCountry, searchCountries } from "../../api/locations.api";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import DeleteModal from "../../Components/Common/DeleteModal";
import FormsHeader from "../../Components/Common/FormsModalHeader";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/AuthContext";
import { MenuContext } from "../../context/MenuContext";
import ReferenceErrorModal from "../../Components/Common/ReferenceErrorModal";

const initialState = {
  countryName: "",
  countryCode:"",
  isActive: true,
};

const Country = () => {
  const { adminData } = useContext(AuthContext);
  const { currentPagePermissions } = useContext(MenuContext);
  const navigate = useNavigate();

  const [filter, setFilter] = useState(true);
  const [query, setQuery] = useState("");
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(100);
  const [pageNo, setPageNo] = useState(0);
  const [column, setcolumn] = useState();
  const [sortDirection, setsortDirection] = useState();

  const [remove_id, setRemove_id] = useState("");
  const [modal_delete, setmodal_delete] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [referenceModal, setReferenceModal] = useState(false);
  const [referenceData, setReferenceData] = useState(null);

  useEffect(() => {
    fetchCountries();
  }, [pageNo, perPage, column, sortDirection, query, filter]);

  const fetchCountries = async () => {
    setLoading(true);
    let skip = (pageNo - 1) * perPage;
    if (skip < 0) skip = 0;
    await searchCountries({
      skip,
      per_page: perPage,
      sorton: column,
      sortdir: sortDirection,
      match: query,
      isActive: filter,
    }).then((response) => {
      if (response.data.data.length > 0) {
        let res = response.data.data[0];
        setCountries(res.data);
        setTotalRows(res.count);
      } else {
        setCountries([]);
      }
    });
    setLoading(false);
  };

  const tog_delete = (_id) => {
    setmodal_delete(!modal_delete);
    setRemove_id(_id);
  };

  const handleDelete = (e) => {
    e.preventDefault();
    setIsDeleteLoading(true);
    deleteCountry(remove_id)
      .then(() => {
        setmodal_delete(false);
        fetchCountries();
        toast.success("Country Removed Successfully!");
      })
      .catch((err) => {
        setmodal_delete(false);
        if (err.response && err.response.status === 409) {
          setReferenceData(err.response.data);
          setReferenceModal(true);
        } else {
          toast.error("Failed to delete country. Please try again.");
        }
      })
      .finally(() => setIsDeleteLoading(false));
  };

  const col = [
    {
      name: "Sr No",
      selector: (row, index) => index + 1,
      sortable: true,
      maxWidth: "20px",
    },
    {
      name: "Country Name",
      selector: (row) => row.countryName,
      minWidth: "130px",
    },
    {
      name: "Country Code",
      selector: (row) => row.countryCode,
    },
    {
      name: "Action",
      selector: (row) => (
        <div className="d-flex gap-2">
          {currentPagePermissions.read && (
            <button
              className="btn btn-sm btn-info"
              onClick={() => navigate(`/country/${row._id}`)}
            >
              View
            </button>
          )}
          {currentPagePermissions.edit && (
            <button
              className="btn btn-sm btn-success"
              onClick={() => navigate(`/country/${row._id}/edit`)}
            >
              Edit
            </button>
          )}
          {currentPagePermissions.delete && (
            <button
              className="btn btn-sm btn-danger"
              onClick={() => tog_delete(row._id)}
            >
              Remove
            </button>
          )}
          {!currentPagePermissions.read && !currentPagePermissions.edit && !currentPagePermissions.delete && (
            <span className="text-muted">No actions available</span>
          )}
        </div>
      ),
      sortable: false,
      minWidth: "220px",
    },
  ];

  document.title = `Country | ${adminData?.companyName}`;

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <BreadCrumb maintitle="Master" title="Country" pageTitle="Master" />
          <Row>
            <Col lg={12}>
              <Card>
                <CardHeader>
                  <FormsHeader
                    formName="Country"
                    filter={filter}
                    handleFilter={(e) => setFilter(e.target.checked)}
                    tog_list={() => navigate("/country/add")}
                    setQuery={setQuery}
                    showAddButton={currentPagePermissions.write}
                  />
                </CardHeader>
                <CardBody>
                  <div className="table-responsive table-card mt-1 mb-1">
                    <DataTable
                      columns={col}
                      data={countries}
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

      <ReferenceErrorModal
        isOpen={referenceModal}
        toggle={() => { setReferenceModal(false); setReferenceData(null); }}
        title="Cannot Delete Country"
        referenceData={referenceData}
      />
    </React.Fragment>
  );
};

export default Country;
