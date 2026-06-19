import { useState, useEffect, useContext } from "react";
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
        <BreadCrumb maintitle="Recruitment" title="Application Detail" pageTitle="Applications" pageTitlePath="/applications" />

        <SectionCard title="Candidate Details">
          {!c ? (
            <div className="alert alert-warning py-2 mb-0">
              Candidate record not found for registration ID <strong>{app?.registration_id}</strong>
            </div>
          ) : (
            <>
              <Row className="mb-4">
                <StoredFileViewer label="Profile Photo" path={c.photo_path} url={c.photo_url} />
              </Row>

              <Row className="mb-3">
                <Field label="Registration ID" value={c.registration_id} mono span={4} />
                <Field label="Full Name" value={c.name} span={4} />
                <Field label="Date of Birth" value={fmtDate(c.dob)} span={4} />
              </Row>

              <Row className="mb-3">
                <Field label="Father / Husband Name" value={c.father_husband_name} span={4} />
                <Field label="Gender" value={c.gender} span={4} />
                <Field label="Category" value={c.category} span={4} />
              </Row>

              <Row className="mb-3">
                <Field label="Marital Status" value={c.marital_status} span={4} />
                <Field label="Mobile" value={`${c.mobile}${c.mobile_verified ? " ✓" : ""}`} span={4} />
                <Field label="Email" value={`${c.email || "—"}${c.email_verified ? " ✓" : ""}`} span={4} />
              </Row>

              <Row className="mb-3">
                <Field label="Qualification" value={c.qualification} span={4} />
                {c.ph_status && (
                  <Field label="PH Type" value={c.ph_type || "—"} span={4} />
                )}
                {!c.ph_status && c.caste_cert_no && (
                  <Field label="Caste Cert. No." value={c.caste_cert_no} span={4} />
                )}
              </Row>

              {c.ph_status && c.caste_cert_no && (
                <Row className="mb-3">
                  <Field label="Caste Cert. No." value={c.caste_cert_no} span={4} />
                </Row>
              )}

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 0.3, fontWeight: 600, marginBottom: 8 }}>Permanent Address</div>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: "#333", lineHeight: 1.6, padding: 10, backgroundColor: "#f8f9fa", borderRadius: 3 }}>{addrLine(c.address_permanent) || "—"}</div>
              </div>

              {!c.address_current?.same_as_permanent && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 0.3, fontWeight: 600, marginBottom: 8 }}>Current Address</div>
                  <div style={{ fontSize: 13.5, fontWeight: 500, color: "#333", lineHeight: 1.6, padding: 10, backgroundColor: "#f8f9fa", borderRadius: 3 }}>{addrLine(c.address_current) || "—"}</div>
                </div>
              )}
            </>
          )}
        </SectionCard>

        {c && (
          <SectionCard title="Educational Details">
            <Row>
              <Field label="Qualification" value={c.qualification} span={6} />
              <Field label="Mother Tongue" value={c.mother_tongue} span={6} />
              {c.languages?.length > 0 && (
                <Col md={12} className="mb-3">
                  <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 6 }}>Languages Known</div>
                  <table className="table table-sm table-bordered mb-0" style={{ fontSize: 13 }}>
                    <thead className="table-light"><tr><th style={{ width: "40%" }}>Language</th><th style={{ width: "20%" }} className="text-center">Read</th><th style={{ width: "20%" }} className="text-center">Write</th><th style={{ width: "20%" }} className="text-center">Speak</th></tr></thead>
                    <tbody>
                      {c.languages.map((l, i) => (
                        <tr key={i}><td>{l.language}</td><td className="text-center">{l.read ? "✓" : "—"}</td><td className="text-center">{l.write ? "✓" : "—"}</td><td className="text-center">{l.speak ? "✓" : "—"}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </Col>
              )}
            </Row>
          </SectionCard>
        )}

        {c && (c.photo_path || c.signature_path || c.caste_cert_path || (c.ph_status && c.udid_cert_path)) && (
          <SectionCard title="Documents">
            <Row>
              {c.photo_path && <StoredFileViewer label="Photo" path={c.photo_path} url={c.photo_url} />}
              {c.signature_path && <StoredFileViewer label="Signature" path={c.signature_path} url={c.signature_url} />}
            </Row>
            {(c.caste_cert_path || (c.ph_status && c.udid_cert_path)) && (
              <Row>
                {c.caste_cert_path && <StoredFileViewer label="Caste Certificate" path={c.caste_cert_path} url={c.caste_cert_url} />}
                {c.ph_status && c.udid_cert_path && <StoredFileViewer label="UDID Certificate" path={c.udid_cert_path} url={c.udid_cert_url} />}
              </Row>
            )}
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
            <Field label="Application Ref No" value={app?.application_ref_no} mono span={6} />
            <Field label="Advertisement No" value={app?.advt_no} mono span={6} />
            <Field label="Post Title" value={advt?.post_title?.en} span={6} />
            <Field label="Submitted At" value={fmtDateTime(app?.submitted_at)} span={6} />
            {app?.exam_centre && <Field label="Exam Centre" value={app.exam_centre} span={6} />}
            {app?.experience_years != null && <Field label="Experience (years)" value={String(app.experience_years)} span={6} />}
            <Field label="Declaration Accepted" value={app?.declaration_accepted ? "Yes" : "No"} span={6} />
          </Row>
        </SectionCard>

        {advt && (
          <SectionCard title="Advertisement Details">
            <Row>
              <Field label="Post Title (Gujarati)" value={advt.post_title?.gu} span={6} />
              <Field label="Class" value={advt.class ? `Class ${advt.class}` : null} span={6} />
              <Field label="Department" value={advt.department?.departmentName || advt.department?.name} span={6} />
              <Field label="Pay Scale" value={advt.pay_scale} span={6} />
              <Field label="Application Fee" value={advt.application_fee ? `₹ ${advt.application_fee}` : "Free"} span={6} />
              <Field label="Last Date" value={fmtDate(advt.end_date)} span={6} />
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
