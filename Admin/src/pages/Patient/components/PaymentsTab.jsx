import React, { useState, useEffect } from "react";
import { Card, CardBody, Spinner, Table, Badge } from "reactstrap";
import { getPatientPayments } from "../../../api/invoices.api";

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-";

const formatCurrency = (amt) =>
  amt != null ? `₹${Number(amt).toLocaleString("en-IN")}` : "-";

const PaymentsTab = ({ patientId }) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patientId) return;
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await getPatientPayments(patientId);
        if (res.data.isOk) {
          setPayments(res.data.data || []);
        }
      } catch (err) {
        console.error("Failed to fetch payments:", err);
      }
      setLoading(false);
    };
    fetch();
  }, [patientId]);

  if (loading) {
    return <div className="text-center py-4"><Spinner size="sm" color="primary" /> Loading payments...</div>;
  }

  if (!payments.length) {
    return (
      <Card>
        <CardBody>
          <p className="text-muted mb-0">No payments found for this patient.</p>
        </CardBody>
      </Card>
    );
  }

  const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <Card>
      <CardBody>
        {/* Summary */}
        <div className="d-flex justify-content-between align-items-center mb-3 p-3 bg-light rounded">
          <div>
            <span className="text-muted">Total Payments:</span>{" "}
            <strong>{payments.length}</strong>
          </div>
          <div>
            <span className="text-muted">Total Paid:</span>{" "}
            <Badge color="success" className="fs-6">{formatCurrency(totalPaid)}</Badge>
          </div>
        </div>

        <div className="table-responsive">
          <Table className="table-hover table-nowrap align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Receipt #</th>
                <th>Date</th>
                <th>Invoice #</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p._id}>
                  <td className="fw-semibold">{p.receiptNumber || "-"}</td>
                  <td>{formatDate(p.paymentDate)}</td>
                  <td>{p.invoiceId?.invoiceNumber || "-"}</td>
                  <td className="fw-semibold text-success">{formatCurrency(p.amount)}</td>
                  <td>{p.paymentMethodId?.label || "-"}</td>
                  <td className="text-muted" style={{ maxWidth: "200px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {p.notes || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </CardBody>
    </Card>
  );
};

export default PaymentsTab;
