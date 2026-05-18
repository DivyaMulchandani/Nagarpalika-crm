import React, { useState, useEffect, useContext } from "react";
import { Card, CardBody, CardHeader, Col, Container, Row } from "reactstrap";
import DataTable from "react-data-table-component";
import { useNavigate } from "react-router-dom";
import { deleteCurrency, searchCurrencies } from "../../api/currencies.api";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import DeleteModal from "../../Components/Common/DeleteModal";
import ReferenceErrorModal from "../../Components/Common/ReferenceErrorModal";
import FormsHeader from "../../Components/Common/FormsModalHeader";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/AuthContext";
import { MenuContext } from "../../context/MenuContext";

const initialState = {
  currencyName: "",
  currencyCode:"",
  currencySymbol: "",
  isActive: true,
};

const CurrencyMaster = () => {
  const { adminData } = useContext(AuthContext);
  const { currentPagePermissions } = useContext(MenuContext);
  const navigate = useNavigate();

  const [filter, setFilter] = useState(true);
  const [query, setQuery] = useState("");
  const [currencies, setCurrencies] = useState([]);
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

  useEffect(() => { fetchCurrencies(); }, [pageNo, perPage, column, sortDirection, query, filter]);

  const fetchCurrencies = async () => {
    setLoading(true);
    let skip = (pageNo - 1) * perPage;
    if (skip < 0) skip = 0;
    try {
      const response = await searchCurrencies({ skip, per_page: perPage, sorton: column, sortdir: sortDirection, match: query, isActive: filter });
      if (response.data.data.length > 0) {
        setCurrencies(response.data.data[0].data);
        setTotalRows(response.data.data[0].count);
      } else {
        setCurrencies([]);
      }
    } catch {
      setCurrencies([]);
    }
    setLoading(false);
  };

  const handleDelete = (e) => {
    e.preventDefault();
    setIsDeleteLoading(true);
    deleteCurrency(remove_id)
      .then(() => { setmodal_delete(false); fetchCurrencies(); toast.success("Currency Removed Successfully!"); })
      .catch((err) => {
        setmodal_delete(false);
        if (err.response && err.response.status === 409) { setReferenceData(err.response.data); setReferenceModal(true); }
        else toast.error("Failed to delete currency. Please try again.");
      })
      .finally(() => setIsDeleteLoading(false));
  };

  const col = [
    { name: "Sr No", selector: (row, index) => index + 1, maxWidth: "20px" },
    { name: "Currency Name", selector: (row) => row.currencyName, minWidth: "130px" },
    { name: "Currency Code", selector: (row) => row.currencyCode },
    { name: "Currency Symbol", selector: (row) => row.currencySymbol },
    {
      name: "Action",
      selector: (row) => (
        <div className="d-flex gap-2">
          {currentPagePermissions.read && (
            <button className="btn btn-sm btn-info" onClick={() => navigate(`/currency-master/${row._id}`)}>View</button>
          )}
          {currentPagePermissions.edit && (
            <button className="btn btn-sm btn-success" onClick={() => navigate(`/currency-master/${row._id}/edit`)}>Edit</button>
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

  document.title = `Currency Master | ${adminData?.companyName}`;

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <BreadCrumb maintitle="Master" title="Currency" pageTitle="Master" />
          <Row>
            <Col lg={12}>
              <Card>
                <CardHeader>
                  <FormsHeader
                    formName="Currency"
                    filter={filter}
                    handleFilter={(e) => { setPageNo(1); setFilter(e.target.checked); }}
                    tog_list={() => navigate("/currency-master/add")}
                    setQuery={setQuery}
                    showAddButton={currentPagePermissions.write}
                  />
                </CardHeader>
                <CardBody>
                  <div className="table-responsive table-card mt-1 mb-1">
                    <DataTable
                      columns={col}
                      data={currencies}
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
        title="Cannot Delete Currency"
        referenceData={referenceData}
      />
    </React.Fragment>
  );
};

export default CurrencyMaster;
