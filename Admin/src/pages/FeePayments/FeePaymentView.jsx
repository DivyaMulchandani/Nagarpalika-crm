import React, { useState, useEffect, useContext } from "react";
import { Card, CardBody, CardHeader, Col, Container, Row, Badge, Button } from "reactstrap";
import { useParams, useNavigate } from "react-router-dom";
import { getFeePaymentById } from "../../api/feePayments.api";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/AuthContext";

const Field = ({ label, value, mono }) => (
  <Col md={4} className="mb-3">
    <div style={{ fontSize: 11, color: "#888", marginBottom: 2 }}>{label}</div>
    <div style={{ fontWeight: 500, fontFamily: mono ? "monospace" : undefined }}>{value ?? "—"}</div>
  </Col>
);

const statusColor = { pending: "warning", paid: "success", failed: "danger" };

const FeePaymentView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { adminData } = useContext(AuthContext);
  const [fee, setFee] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFeePaymentById(id)
      .then((r) => setFee(r.data.data))
      .catch(() => toast.error("Failed to load payment"))
      .finally(() => setLoading(false));
  }, [id]);

  const fmtDate = (d) => d ? new Date(d).toLocaleString("en-IN") : "—";
  document.title = `Fee Payment | ${adminData?.companyName}`;

  if (loading) return <div className="page-content text-center py-5"><span className="spinner-border"></span></div>;
  if (!fee) return <div className="page-content text-center py-5 text-danger">Payment not found</div>;

  return (
    <div className="page-content">
      <Container fluid>
        <BreadCrumb maintitle="Recruitment" title="Fee Payment Detail" pageTitle="Fee Payments" pageTitlePath="/fee-payments" />
        <Card>
          <CardHeader className="d-flex align-items-center justify-content-between">
            <h6 className="mb-0">Payment — <span style={{ fontFamily: "monospace" }}>{fee.payment_id}</span></h6>
            <Badge color={statusColor[fee.status] || "secondary"}>{fee.status}</Badge>
          </CardHeader>
          <CardBody>
            <Row>
              <Field label="Payment ID" value={fee.payment_id} mono />
              <Field label="Registration ID" value={fee.registration_id} mono />
              <Field label="Advertisement No" value={fee.advt_no} mono />
              <Field label="Application Ref No" value={fee.application_ref_no} mono />
              <Field label="Amount (₹)" value={fee.amount != null ? `₹${fee.amount}` : null} />
              <Field label="Razorpay Order ID" value={fee.razorpay_order_id} mono />
              <Field label="Gateway Txn ID" value={fee.gateway_txn_id} mono />
              <Field label="Paid At" value={fmtDate(fee.paid_at)} />
              <Field label="Created At" value={fmtDate(fee.createdAt)} />
            </Row>
            {fee.status === "paid" && (
              <div className="mt-2">
                <a href={`/api/v1/fee-payments/${fee.payment_id}/receipt`} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-primary">
                  <i className="ri-file-pdf-line me-1"></i>Download Receipt PDF
                </a>
              </div>
            )}
          </CardBody>
        </Card>
        <div className="mt-3">
          <Button color="secondary" onClick={() => navigate("/fee-payments")}>Back to List</Button>
        </div>
      </Container>
    </div>
  );
};

export default FeePaymentView;
