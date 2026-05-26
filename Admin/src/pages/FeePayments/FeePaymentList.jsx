import React, { useState, useCallback, useContext } from "react";
import { Card, CardBody, CardHeader, Col, Container, Row, Badge, Button } from "reactstrap";
import DataTable from "react-data-table-component";
import Select from "react-select";
import { useNavigate } from "react-router-dom";
import { listFeePayments } from "../../api/feePayments.api";
import { getAllAdvertisements } from "../../api/advertisements.api";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import { AuthContext } from "../../context/AuthContext";
import { MenuContext } from "../../context/MenuContext";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "paid",    label: "Paid" },
  { value: "failed",  label: "Failed" },
];
const statusColor = { pending: "warning", paid: "success", failed: "danger" };

const FeePaymentList = () => {
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
  const [statusFilter, setStatusFilter] = useState(null);
  const [advtFilter, setAdvtFilter] = useState(null);
  const [advtOptions, setAdvtOptions] = useState([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  React.useEffect(() => {
    getAllAdvertisements()
      .then((r) => setAdvtOptions((r.data.data || []).map((a) => ({ value: a.advt_no, label: `${a.advt_no} — ${a.post_title?.en || ""}` }))))
      .catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listFeePayments({
        skip: (pageNo - 1) * perPage,
        per_page: perPage,
        sorton: column || "createdAt",
        sortdir: sortDir || "desc",
        status: statusFilter?.value || undefined,
        advt_no: advtFilter?.value || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
      });
      setData(res.data.data || []);
      setTotalRows(res.data.total || 0);
    } catch {
      setData([]);
    }
    setLoading(false);
  }, [pageNo, perPage, column, sortDir, statusFilter, advtFilter, fromDate, toDate]);

  React.useEffect(() => { fetchData(); }, [fetchData]);

  const columns = [
    { name: "Payment ID", selector: (r) => r.payment_id, width: "160px", style: { fontFamily: "monospace", fontSize: 12 } },
    { name: "Reg ID", selector: (r) => r.registration_id, width: "150px" },
    { name: "Advt No", selector: (r) => r.advt_no, width: "130px" },
    { name: "Amount (₹)", selector: (r) => r.amount ?? "—", width: "110px", right: true },
    {
      name: "Status",
      cell: (r) => <Badge color={statusColor[r.status] || "secondary"}>{r.status}</Badge>,
      width: "100px",
      center: true,
    },
    { name: "Gateway Txn", selector: (r) => r.gateway_txn_id || "—", width: "160px", style: { fontFamily: "monospace", fontSize: 11 } },
    { name: "Paid At", selector: (r) => r.paid_at ? new Date(r.paid_at).toLocaleDateString("en-IN") : "—", width: "110px" },
    {
      name: "Actions",
      cell: (r) => currentPagePermissions.read
        ? <button className="btn btn-sm btn-info" onClick={() => navigate(`/fee-payments/${r._id}`)}>View</button>
        : null,
      width: "90px",
    },
  ];

  document.title = `Fee Payments | ${adminData?.companyName}`;

  return (
    <div className="page-content">
      <Container fluid>
        <BreadCrumb maintitle="Recruitment" title="Fee Payments" pageTitle="Recruitment" />
        <Row><Col lg={12}>
          <Card>
            <CardHeader>
              <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between">
                <div className="d-flex flex-wrap gap-2 align-items-center">
                  <div style={{ width: 240 }}>
                    <Select options={advtOptions} value={advtFilter} onChange={(v) => { setAdvtFilter(v); setPageNo(1); }} placeholder="Advertisement" isClearable isSearchable />
                  </div>
                  <div style={{ width: 150 }}>
                    <Select options={STATUS_OPTIONS} value={statusFilter} onChange={(v) => { setStatusFilter(v); setPageNo(1); }} placeholder="Status" isClearable isSearchable />
                  </div>
                  <input type="date" className="form-control form-control-sm" style={{ width: 140 }} value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPageNo(1); }} />
                  <input type="date" className="form-control form-control-sm" style={{ width: 140 }} value={toDate} onChange={(e) => { setToDate(e.target.value); setPageNo(1); }} />
                </div>
                <Button color="outline-secondary" size="sm" onClick={() => navigate("/fee-payments/reconciliation")}>
                  <i className="ri-pie-chart-line me-1"></i>Reconciliation
                </Button>
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

export default FeePaymentList;
