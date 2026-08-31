import { useState, useEffect, useContext } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Col,
  Container,
  Row,
  Badge,
  Button,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Label,
  FormFeedback,
  Spinner,
} from "reactstrap";
import { useParams, useNavigate } from "react-router-dom";
import { getApplicationByRef, updateApplicationStatus } from "../../api/applications.api";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/AuthContext";
import { MenuContext } from "../../context/MenuContext";
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

// Mirrors Server/constants/applicationStatus.js — admin-initiated transitions only.
const ALLOWED_TRANSITIONS = {
  submitted: ["under_review", "rejected"],
  under_review: ["shortlisted", "rejected"],
  shortlisted: ["selected", "rejected"],
  rejected: [],
  selected: [],
};

const countWords = (text) => {
  if (!text || typeof text !== "string") return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
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
  const { currentPagePermissions } = useContext(MenuContext);
  const [rec, setRec] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Status Change Modal State
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(null);
  const [statusReason, setStatusReason] = useState("");
  const [statusReasonError, setStatusReasonError] = useState(null);

  useEffect(() => {
    getApplicationByRef(ref)
      .then((r) => setRec(r.data.data))
      .catch(() => toast.error("Failed to load application"))
      .finally(() => setLoading(false));
  }, [ref]);

  const openStatusModal = (nextStatus) => {
    setPendingStatus(nextStatus);
    setStatusReason("");
    setStatusReasonError(null);
    setStatusModalOpen(true);
  };

  const handleStatusSubmit = async () => {
    const words = countWords(statusReason);
    if (words < 10) {
      setStatusReasonError(
        `Reason is mandatory and must be at least 10 words (currently ${words} word${words === 1 ? "" : "s"}).`
      );
      return;
    }
    setStatusReasonError(null);
    setStatusUpdating(true);
    try {
      const res = await updateApplicationStatus(
        rec.application._id,
        pendingStatus,
        statusReason.trim()
      );
      setRec((prev) => ({
        ...prev,
        application: {
          ...prev.application,
          status: res.data.data.status,
          edit_log: res.data.data.edit_log,
        },
      }));
      toast.success(`Application marked as ${pendingStatus.replace(/_/g, " ")}`);
      setStatusModalOpen(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update status");
    } finally {
      setStatusUpdating(false);
    }
  };

  document.title = `Application ${ref} | ${adminData?.companyName || "Nagarpalika"}`;

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
            <div className="d-flex align-items-center gap-2">
              <Badge color={statusColor[app?.status] || "secondary"} className="text-uppercase">
                {app?.status?.replace(/_/g, " ")}
              </Badge>
              {currentPagePermissions.edit && ALLOWED_TRANSITIONS[app?.status]?.length > 0 && (
                <div className="d-flex gap-1">
                  {ALLOWED_TRANSITIONS[app.status].map((next) => (
                    <Button
                      key={next}
                      size="sm"
                      color={statusColor[next] || "secondary"}
                      outline
                      disabled={statusUpdating}
                      onClick={() => openStatusModal(next)}
                    >
                      Mark {next.replace(/_/g, " ")}
                    </Button>
                  ))}
                </div>
              )}
            </div>
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

        {app?.edit_log?.some((e) => e.field === "status") && (
          <SectionCard title="Status History & Audit Log">
            <div className="table-responsive">
              <table className="table table-sm table-bordered align-middle mb-0" style={{ fontSize: 13 }}>
                <thead className="table-light">
                  <tr>
                    <th style={{ width: "13%" }}>From Status</th>
                    <th style={{ width: "13%" }}>To Status</th>
                    <th style={{ width: "38%" }}>Reason / Officer Remarks</th>
                    <th style={{ width: "20%" }}>Action Taken By</th>
                    <th style={{ width: "16%" }}>Date & Time</th>
                  </tr>
                </thead>
                <tbody>
                  {app.edit_log
                    .filter((e) => e.field === "status")
                    .map((e, i) => (
                      <tr key={i}>
                        <td>
                          <Badge color={statusColor[e.old_value] || "secondary"} className="text-uppercase">
                            {e.old_value?.replace(/_/g, " ") || "—"}
                          </Badge>
                        </td>
                        <td>
                          <Badge color={statusColor[e.new_value] || "secondary"} className="text-uppercase">
                            {e.new_value?.replace(/_/g, " ") || "—"}
                          </Badge>
                        </td>
                        <td>
                          <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.4 }}>
                            {e.reason ? (
                              <span>{e.reason}</span>
                            ) : (
                              <span className="text-muted fst-italic">No reason recorded</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="fw-semibold text-dark">
                            {e.changed_by_name || "Admin Officer"}
                          </div>
                          {e.changed_by_role && (
                            <small className="badge bg-light text-muted border">
                              {e.changed_by_role}
                            </small>
                          )}
                        </td>
                        <td>{fmtDateTime(e.changed_at)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        )}

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

        {/* Status Confirmation & Mandatory 10-Word Reason Modal */}
        <Modal
          isOpen={statusModalOpen}
          toggle={() => !statusUpdating && setStatusModalOpen(false)}
          centered
          backdrop="static"
        >
          <ModalHeader
            toggle={() => !statusUpdating && setStatusModalOpen(false)}
            className={
              pendingStatus === "rejected"
                ? "bg-danger text-white"
                : pendingStatus === "under_review"
                ? "bg-info text-white"
                : pendingStatus === "shortlisted"
                ? "bg-warning text-dark"
                : pendingStatus === "selected"
                ? "bg-success text-white"
                : "bg-primary text-white"
            }
          >
            Confirm Status Change: Mark {pendingStatus?.replace(/_/g, " ").toUpperCase()}
          </ModalHeader>
          <ModalBody>
            <div className="mb-3 p-2 bg-light rounded border">
              <Row className="g-2 text-muted" style={{ fontSize: 12 }}>
                <Col sm={6}><strong>Candidate:</strong> {c?.name || "—"}</Col>
                <Col sm={6}><strong>Reg. ID:</strong> {app?.registration_id || "—"}</Col>
                <Col sm={6}><strong>Ref No:</strong> {app?.application_ref_no || "—"}</Col>
                <Col sm={6}>
                  <strong>Action:</strong>{" "}
                  <Badge color={statusColor[app?.status] || "secondary"} className="text-uppercase me-1">
                    {app?.status?.replace(/_/g, " ")}
                  </Badge>
                  →
                  <Badge color={statusColor[pendingStatus] || "secondary"} className="text-uppercase ms-1">
                    {pendingStatus?.replace(/_/g, " ")}
                  </Badge>
                </Col>
              </Row>
            </div>

            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <Label htmlFor="statusReasonInput" className="form-label mb-0 fw-semibold">
                  Reason for Status Change <span className="text-danger">*</span>
                </Label>
                <span
                  style={{ fontSize: 12 }}
                  className={
                    countWords(statusReason) >= 10
                      ? "text-success fw-semibold"
                      : "text-danger fw-semibold"
                  }
                >
                  {countWords(statusReason)} / 10 words minimum
                </span>
              </div>
              <Input
                id="statusReasonInput"
                type="textarea"
                rows={4}
                value={statusReason}
                onChange={(e) => {
                  setStatusReason(e.target.value);
                  if (statusReasonError && countWords(e.target.value) >= 10) {
                    setStatusReasonError(null);
                  }
                }}
                placeholder={
                  pendingStatus === "rejected"
                    ? "Enter detailed reason for rejection (e.g. Incomplete documentation, age criteria not met, qualification degree certificate not attached properly)..."
                    : pendingStatus === "under_review"
                    ? "Enter detailed reason for marking under review (e.g. Document scrutiny in progress for caste certificate validation and sports quota verification)..."
                    : "Enter detailed reason or remarks for this status update..."
                }
                invalid={!!statusReasonError}
                disabled={statusUpdating}
              />
              {statusReasonError ? (
                <FormFeedback>{statusReasonError}</FormFeedback>
              ) : (
                <div className="mt-1" style={{ fontSize: 12 }}>
                  {countWords(statusReason) < 10 ? (
                    <span className="text-danger">
                      Please write at least {10 - countWords(statusReason)} more word{10 - countWords(statusReason) === 1 ? "" : "s"}.
                    </span>
                  ) : (
                    <span className="text-success fw-medium">
                      ✓ Minimum word requirement satisfied ({countWords(statusReason)} words).
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="alert alert-secondary py-2 mb-0 d-flex align-items-center gap-2" style={{ fontSize: 12 }}>
              <i className="ri-information-line fs-15 text-primary"></i>
              <div>
                This action and reason will be permanently recorded in the audit log under{" "}
                <strong>{adminData?.employeeName || adminData?.name || adminData?.emailOffice || adminData?.email || "Current User"}</strong> (
                {adminData?.role || "ADMIN"}).
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              color="light"
              disabled={statusUpdating}
              onClick={() => setStatusModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              color={statusColor[pendingStatus] || "primary"}
              disabled={statusUpdating || countWords(statusReason) < 10}
              onClick={handleStatusSubmit}
            >
              {statusUpdating ? (
                <>
                  <Spinner size="sm" className="me-1" /> Updating...
                </>
              ) : (
                `Confirm & Mark ${pendingStatus?.replace(/_/g, " ")}`
              )}
            </Button>
          </ModalFooter>
        </Modal>
      </Container>
    </div>
  );
};

export default ApplicationView;
