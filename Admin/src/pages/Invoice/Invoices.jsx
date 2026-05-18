import React, { useState, useEffect, useContext } from "react";
import { Card, CardBody, CardHeader, Col, Container, Row, Badge, Input, Label } from "reactstrap";
import DataTable from "react-data-table-component";
import { useNavigate } from "react-router-dom";
import { searchInvoices, deleteInvoice } from "../../api/invoices.api";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import DeleteModal from "../../Components/Common/DeleteModal";
import FormsHeader from "../../Components/Common/FormsModalHeader";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/AuthContext";
import { MenuContext } from "../../context/MenuContext";

const statusColors = {
  draft: "secondary",
  issued: "primary",
  paid: "success",
  partially_paid: "warning",
  overdue: "danger",
  cancelled: "dark",
};

const formatDate = (d) => {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const Invoices = () => {
  const { adminData } = useContext(AuthContext);
  const { currentPagePermissions } = useContext(MenuContext);
  const navigate = useNavigate();

  const [filter, setFilter] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(100);
  const [pageNo, setPageNo] = useState(0);
  const [column, setColumn] = useState();
  const [sortDirection, setSortDirection] = useState();
  const [remove_id, setRemoveId] = useState("");
  const [modal_delete, setModalDelete] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);

  useEffect(() => { fetchData(); }, [pageNo, perPage, column, sortDirection, query, filter, statusFilter]);

  const fetchData = async () => {
    setLoading(true);
    let skip = (pageNo - 1) * perPage;
    if (skip < 0) skip = 0;
    try {
      const params = { skip, per_page: perPage, sorton: column, sortdir: sortDirection, match: query, isActive: filter };
      if (statusFilter) params.status = statusFilter;
      const response = await searchInvoices(params);
      if (response.data.data && response.data.data.length > 0) {
        setData(response.data.data[0].data);
        setTotalRows(response.data.data[0].count);
      } else {
        setData([]);
        setTotalRows(0);
      }
    } catch {
      setData([]);
    }
    setLoading(false);
  };

  const handleDelete = (e) => {
    e.preventDefault();
    setIsDeleteLoading(true);
    deleteInvoice(remove_id)
      .then(() => { setModalDelete(false); fetchData(); toast.success("Invoice Removed!"); })
      .catch((err) => { setModalDelete(false); toast.error(err?.response?.data?.message || "Failed to delete."); })
      .finally(() => setIsDeleteLoading(false));
  };

  const getPatientName = (row) => {
    const p = row.patient;
    if (!p) return "-";
    return `${p.firstName || ""} ${p.lastName || ""}`.trim() || "-";
  };

  const col = [
    { name: "Invoice #", selector: (row) => row.invoiceNumber, sortable: true, sortField: "invoiceNumber", minWidth: "140px" },
    { name: "Date", selector: (row) => formatDate(row.createdAt), sortable: true, sortField: "createdAt", maxWidth: "110px" },
    { name: "Patient", selector: (row) => getPatientName(row), minWidth: "150px" },
    { name: "Grand Total", selector: (row) => `₹${(row.grandTotal || 0).toFixed(2)}`, sortable: true, sortField: "grandTotal", maxWidth: "120px" },
    { name: "Paid", selector: (row) => `₹${(row.paidAmount || 0).toFixed(2)}`, maxWidth: "100px" },
    { name: "Balance", selector: (row) => `₹${(row.balanceAmount || 0).toFixed(2)}`, maxWidth: "100px" },
    {
      name: "Status",
      selector: (row) => (
        <Badge color={statusColors[row.status] || "secondary"} className="text-capitalize">
          {row.status?.replace(/_/g, " ")}
        </Badge>
      ),
      maxWidth: "130px",
    },
    {
      name: "Action",
      selector: (row) => (
        <div className="d-flex gap-2">
          {currentPagePermissions.read && (
            <button className="btn btn-sm btn-info" onClick={() => navigate(`/invoices/${row._id}`)}>View</button>
          )}
          {currentPagePermissions.edit && row.status !== "paid" && (
            <button className="btn btn-sm btn-success" onClick={() => navigate(`/invoices/${row._id}/edit`)}>Edit</button>
          )}
          {currentPagePermissions.delete && row.paidAmount === 0 && (
            <button className="btn btn-sm btn-danger" onClick={() => { setModalDelete(true); setRemoveId(row._id); }}>Remove</button>
          )}
        </div>
      ),
      minWidth: "220px",
    },
  ];

  document.title = `Invoices | ${adminData?.companyName}`;

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <BreadCrumb maintitle="Billing" title="Invoices" pageTitle="Billing" />
          <Row className="mb-3">
            <Col md={3}>
              <Label className="form-label">Status</Label>
              <Input type="select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All</option>
                {["draft", "issued", "paid", "partially_paid", "overdue", "cancelled"].map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                ))}
              </Input>
            </Col>
          </Row>
          <Row>
            <Col lg={12}>
              <Card>
                <CardHeader>
                  <FormsHeader
                    formName="Invoice"
                    filter={filter}
                    handleFilter={(e) => { setPageNo(1); setFilter(e.target.checked); }}
                    tog_list={() => navigate("/invoices/add")}
                    setQuery={setQuery}
                    showAddButton={currentPagePermissions.write}
                  />
                </CardHeader>
                <CardBody>
                  <DataTable
                    columns={col}
                    data={data}
                    progressPending={loading}
                    sortServer
                    onSort={(col, dir) => { setColumn(col.sortField); setSortDirection(dir); }}
                    pagination
                    paginationServer
                    paginationTotalRows={totalRows}
                    paginationPerPage={100}
                    paginationRowsPerPageOptions={[50, 100, 200]}
                    onChangeRowsPerPage={(n) => setPerPage(n)}
                    onChangePage={(p) => setPageNo(p)}
                  />
                </CardBody>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>
      <DeleteModal
        show={modal_delete}
        handleDelete={handleDelete}
        toggle={() => setModalDelete(false)}
        setmodal_delete={setModalDelete}
        disabled={isDeleteLoading}
      />
    </React.Fragment>
  );
};

export default Invoices;
