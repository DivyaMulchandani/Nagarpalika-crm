import React, { useState, useEffect, useContext } from "react";
import { Card, CardBody, CardHeader, Col, Container, Row, Badge, Button } from "reactstrap";
import { useParams, useNavigate } from "react-router-dom";
import { getApplicationByRef } from "../../api/applications.api";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/AuthContext";

const Field = ({ label, value, mono }) => (
  <Col md={4} className="mb-3">
    <div style={{ fontSize: 11, color: "#888", marginBottom: 2 }}>{label}</div>
    <div style={{ fontWeight: 500, fontFamily: mono ? "monospace" : undefined }}>{value || "—"}</div>
  </Col>
);

const ApplicationView = () => {
  const { ref } = useParams();
  const navigate = useNavigate();
  const { adminData } = useContext(AuthContext);
  const [rec, setRec] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getApplicationByRef(ref)
      .then((r) => setRec(r.data.data))
      .catch(() => toast.error("Failed to load application"))
      .finally(() => setLoading(false));
  }, [ref]);

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN") : "—";
  document.title = `Application ${ref} | ${adminData?.companyName}`;

  if (loading) return <div className="page-content text-center py-5"><span className="spinner-border"></span></div>;
  if (!rec) return <div className="page-content text-center py-5 text-danger">Application not found</div>;

  const { application: app, candidate: c, advertisement: advt } = rec;

  return (
    <div className="page-content">
      <Container fluid>
        <BreadCrumb maintitle="Recruitment" title="Application Detail" pageTitle="Applications" />
        <Card className="mb-3">
          <CardHeader><h6 className="mb-0">Candidate</h6></CardHeader>
          <CardBody>
            {!c ? (
              <div className="alert alert-warning py-2 mb-0">
                Candidate record not found for registration ID <strong>{app?.registration_id}</strong>
              </div>
            ) : (
              <Row>
                <Field label="Name" value={c.name} />
                <Field label="Registration ID" value={c.registration_id} mono />
                <Field label="Category" value={c.category} />
                <Field label="Mobile" value={c.mobile} />
                <Field label="Email" value={c.email} />
              </Row>
            )}
          </CardBody>
        </Card>
        <Card className="mb-3">
          <CardHeader className="d-flex align-items-center justify-content-between">
            <h6 className="mb-0">Application</h6>
            <Badge color="primary">{app?.status}</Badge>
          </CardHeader>
          <CardBody><Row>
            <Field label="Application Ref No" value={app?.application_ref_no} mono />
            <Field label="Advertisement No" value={app?.advt_no} mono />
            <Field label="Post Title" value={advt?.post_title?.en} />
            <Field label="Submitted At" value={fmtDate(app?.submitted_at)} />
            <Field label="Exam Centre" value={app?.exam_centre} />
            <Field label="Experience (yrs)" value={app?.experience_years != null ? String(app.experience_years) : null} />
          </Row></CardBody>
        </Card>
        <div className="mt-2">
          <Button color="secondary" onClick={() => navigate("/applications")}>Back to List</Button>
        </div>
      </Container>
    </div>
  );
};

export default ApplicationView;
