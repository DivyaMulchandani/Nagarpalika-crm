import React, { useState, useContext } from "react";
import { Card, CardBody, CardHeader, Col, Container, Row, Button, Table } from "reactstrap";
import { useNavigate } from "react-router-dom";
import { getReconciliation } from "../../api/feePayments.api";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/AuthContext";

const Reconciliation = () => {
  const navigate = useNavigate();
  const { adminData } = useContext(AuthContext);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFetch = () => {
    setLoading(true);
    getReconciliation({ from: fromDate || undefined, to: toDate || undefined })
      .then((r) => setResult(r.data.data))
      .catch(() => toast.error("Failed to load reconciliation"))
      .finally(() => setLoading(false));
  };

  document.title = `Reconciliation | ${adminData?.companyName}`;

  return (
    <div className="page-content">
      <Container fluid>
        <BreadCrumb maintitle="Recruitment" title="Fee Reconciliation" pageTitle="Fee Payments" pageTitlePath="/fee-payments" />
        <Card>
          <CardHeader>
            <div className="d-flex flex-wrap gap-2 align-items-end">
              <div>
                <label className="form-label mb-1" style={{ fontSize: 12 }}>From</label>
                <input type="date" className="form-control form-control-sm" style={{ width: 150 }} value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div>
                <label className="form-label mb-1" style={{ fontSize: 12 }}>To</label>
                <input type="date" className="form-control form-control-sm" style={{ width: 150 }} value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
              <Button color="primary" size="sm" onClick={handleFetch} disabled={loading}>
                {loading && <span className="spinner-border spinner-border-sm me-1"></span>}
                Generate
              </Button>
            </div>
          </CardHeader>
          {result && (
            <CardBody>
              <Row className="mb-3">
                <Col md={4}>
                  <div className="border rounded p-3 text-center">
                    <div style={{ fontSize: 11, color: "#888" }}>Grand Total Collected</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: "#145c2e" }}>
                      ₹{Number(result.grand_total).toLocaleString("en-IN")}
                    </div>
                  </div>
                </Col>
              </Row>
              <Table bordered hover size="sm">
                <thead className="table-light">
                  <tr>
                    <th>Advertisement No</th>
                    <th className="text-end">Applications Paid</th>
                    <th className="text-end">Total Collected (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {(result.by_advt || []).map((row) => (
                    <tr key={row._id}>
                      <td style={{ fontFamily: "monospace" }}>{row._id}</td>
                      <td className="text-end">{row.count}</td>
                      <td className="text-end">₹{Number(row.total_collected).toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                  {!result.by_advt?.length && (
                    <tr><td colSpan={3} className="text-center text-muted py-3">No data for selected range</td></tr>
                  )}
                </tbody>
              </Table>
            </CardBody>
          )}
        </Card>
        <div className="mt-3">
          <Button color="secondary" size="sm" onClick={() => navigate("/fee-payments")}>Back to Fee Payments</Button>
        </div>
      </Container>
    </div>
  );
};

export default Reconciliation;
