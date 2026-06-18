import React, { useState, useEffect, useContext } from "react";
import {
  Card, CardBody, CardHeader, Col, Container, Row, Badge, Button,
} from "reactstrap";
import { useParams, useNavigate } from "react-router-dom";
import { getApplicationByRef } from "../../api/applications.api";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/AuthContext";
import StoredFileViewer from "../../Components/Common/StoredFileViewer";

const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN") : "—";
const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

const statusColor = {
  submitted: "primary",
  under_review: "info",
  shortlisted: "warning",
  rejected: "danger",
  selected: "success",
};

const Field = ({ label, value, mono, span }) => (
  <Col md={span || 4} className="mb-3">
    <div style={{ fontSize: 11, color: "#888", marginBottom: 2, textTransform: "uppercase", letterSpacing: 0.3 }}>{label}</div>
    <div style={{ fontWeight: 500, fontFamily: mono ? "monospace" : undefined, fontSize: 13.5 }}>{value ?? "—"}</div>
  </Col>
);

const SectionCard = ({ title, badge, children }) => (
  <Card className="mb-3">
    <CardHeader className="d-flex align-items-center justify-content-between py-2">
      <h6 className="mb-0">{title}</h6>
      {badge}
    </CardHeader>
    <CardBody>{children}</CardBody>
  </Card>
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

  document.title = `Application ${ref} | ${adminData?.companyName}`;

  if (loading) {
    return (
      <div className="page-content text-center py-5">
        <span className="spinner-border text-primary"></span>
      </div>
    );
  }
  if (!rec) {
    return (
      <div className="page-content text-center py-5 text-danger">
        Application not found.
      </div>
    );
  }

  const { application: app, candidate: c, advertisement: advt } = rec;

  const addrLine = (addr) => {
    if (!addr) return null;
    const parts = [addr.line1, addr.line2, addr.taluka, addr.district, addr.pincode].filter(Boolean);
    return parts.length ? parts.join(", ") : null;
  };

  return (
    <div className="page-content">
      <Container fluid>
        <BreadCrumb maintitle="Recruitment" title="Application Detail" pageTitle="Applications" />

        <SectionCard title="Candidate Details">
          {!c ? (
            <div className="alert alert-warning py-2 mb-0">
              Candidate record not found for registration ID <strong>{app?.registration_id}</strong>
            </div>
          ) : (
            <>
              <Row className="mb-2">
                <StoredFileViewer label="Profile Photo" path={c.photo_path} url={c.photo_url} />
              </Row>
              <Row>
                <Field label="Registration ID" value={c.registration_id} mono />
                <Field label="Full Name" value={c.name} />
                <Field label="Father / Husband Name" value={c.father_husband_name} />
                <Field label="Date of Birth" value={fmtDate(c.dob)} />
                <Field label="Gender" value={c.gender} />
                <Field label="Category" value={c.category} />
                <Field label="Marital Status" value={c.marital_status} />
                <Field label="Nationality" value={c.nationality} />
                <Field label="Religion" value={c.religion} />
                <Field label="PH Type" value={c.ph_type || "N/A"} />
                <Field label="Qualification" value={c.qualification} />
                <Field label="Mobile" value={`${c.mobile}${c.mobile_verified ? " ✓" : ""}`} />
                <Field label="Alternate Mobile" value={c.alternate_mobile} />
                <Field label="Email" value={`${c.email || "—"}${c.email_verified ? " ✓" : ""}`} />
                <Field label="Caste Cert. No." value={c.caste_cert_no} />
                <Field label="Permanent Address" value={addrLine(c.address_permanent)} span={6} />
                {!c.address_current?.same_as_permanent && (
                  <Field label="Current Address" value={addrLine(c.address_current)} span={6} />
                )}
              </Row>
            </>
          )}
        </SectionCard>

        {c && (
          <SectionCard title="Educational Details">
            <Row>
              <Field label="Qualification" value={c.qualification} />
              <Field label="Mother Tongue" value={c.mother_tongue} />
              {c.languages?.length > 0 && (
                <Col md={12} className="mb-3">
                  <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 6 }}>Languages</div>
                  <table className="table table-sm table-bordered mb-0" style={{ maxWidth: 480, fontSize: 13 }}>
                    <thead className="table-light"><tr><th>Language</th><th>Read</th><th>Write</th><th>Speak</th></tr></thead>
                    <tbody>
                      {c.languages.map((l, i) => (
                        <tr key={i}><td>{l.language}</td><td>{l.read ? "✓" : "—"}</td><td>{l.write ? "✓" : "—"}</td><td>{l.speak ? "✓" : "—"}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </Col>
              )}
            </Row>
          </SectionCard>
        )}

        {c && (
          <SectionCard title="OTR Documents">
            <Row>
              <StoredFileViewer label="Photo" path={c.photo_path} url={c.photo_url} />
              <StoredFileViewer label="Signature" path={c.signature_path} url={c.signature_url} />
              {c.caste_cert_path && <StoredFileViewer label="Caste Certificate" path={c.caste_cert_path} url={c.caste_cert_url} />}
              {c.ph_status && <StoredFileViewer label="UDID Certificate" path={c.udid_cert_path} url={c.udid_cert_url} />}
            </Row>
          </SectionCard>
        )}

        <SectionCard
          title="Application Details"
          badge={
            <Badge color={statusColor[app?.status] || "secondary"} className="text-uppercase">
              {app?.status?.replace(/_/g, " ")}
            </Badge>
          }
        >
          <Row>
            <Field label="Application Ref No" value={app?.application_ref_no} mono />
            <Field label="Advertisement No" value={app?.advt_no} mono />
            <Field label="Post Title" value={advt?.post_title?.en} />
            <Field label="Submitted At" value={fmtDateTime(app?.submitted_at)} />
            <Field label="Gender (Declared)" value={app?.additional_fields?.gender} />
            <Field label="Exam Centre" value={app?.exam_centre} />
            <Field label="Experience (yrs)" value={app?.experience_years != null ? String(app.experience_years) : null} />
            <Field label="Declaration Accepted" value={app?.declaration_accepted ? "Yes" : "No"} />
          </Row>
        </SectionCard>

        {advt && (
          <SectionCard title="Advertisement Details">
            <Row>
              <Field label="Post Title (Gujarati)" value={advt.post_title?.gu} />
              <Field label="Class" value={advt.class ? `Class ${advt.class}` : null} />
              <Field label="Department" value={advt.department?.departmentName || advt.department?.name} />
              <Field label="Pay Scale" value={advt.pay_scale} />
              <Field label="Application Fee" value={advt.application_fee ? `₹ ${advt.application_fee}` : "Free"} />
              <Field label="Last Date" value={fmtDate(advt.end_date)} />
            </Row>
            {advt.required_qualifications?.length > 0 && (
              <div className="mt-2">
                <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 6 }}>Required Qualifications</div>
                <div className="d-flex flex-wrap gap-2">
                  {advt.required_qualifications.map((rq, i) => (
                    <span key={i} className={`badge bg-${rq.is_compulsory ? "danger" : "secondary"} fw-normal`} style={{ fontSize: 12 }}>
                      {rq.qualification?.name || rq.qualification}
                      {" — "}{rq.is_compulsory ? "Compulsory" : "Optional"}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {advt.caste_certificate?.required && (
              <div className="mt-3">
                <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 4 }}>Caste Certificate</div>
                <Badge color={advt.caste_certificate.is_compulsory ? "danger" : "secondary"} className="fw-normal" style={{ fontSize: 12 }}>
                  Required — {advt.caste_certificate.is_compulsory ? "Compulsory" : "Optional"}
                </Badge>
              </div>
            )}
          </SectionCard>
        )}

        <SectionCard title="Application Documents">
          {!app?.documents?.length ? (
            <div className="text-muted" style={{ fontSize: 13 }}>No application documents submitted.</div>
          ) : (
            <table className="table table-sm table-bordered mb-0" style={{ fontSize: 13 }}>
              <thead className="table-light">
                <tr><th>#</th><th>Document</th><th>Type</th><th>Uploaded At</th><th>File</th></tr>
              </thead>
              <tbody>
                {app.documents.map((doc, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{doc.label}</td>
                    <td><Badge color={doc.is_compulsory ? "danger" : "secondary"} className="fw-normal">{doc.is_compulsory ? "Compulsory" : "Optional"}</Badge></td>
                    <td>{fmtDateTime(doc.uploaded_at)}</td>
                    <td>
                      {doc.file_path ? (
                        <a href={doc.file_url || "#"} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-primary py-0 px-2" style={{ fontSize: 12 }}>View</a>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionCard>

        <div className="mt-2 mb-4">
          <Button color="secondary" onClick={() => navigate("/applications")}>← Back to List</Button>
        </div>
      </Container>
    </div>
  );
};

export default ApplicationView;
