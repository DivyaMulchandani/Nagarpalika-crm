import React, { useState, useEffect, useContext } from "react";
import { Card, CardBody, CardHeader, Col, Container, Row, Badge, Nav, NavItem, NavLink, TabContent, TabPane, Button } from "reactstrap";
import classnames from "classnames";
import { useParams, useNavigate } from "react-router-dom";
import { getCandidateById } from "../../api/candidates.api";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/AuthContext";

const Field = ({ label, value }) => (
  <Col md={4} className="mb-3">
    <div style={{ fontSize: 11, color: "#888", marginBottom: 2 }}>{label}</div>
    <div style={{ fontWeight: 500 }}>{value || "—"}</div>
  </Col>
);

const CertViewer = ({ label, path }) => {
  const API = import.meta.env.VITE_API_URL || "";
  const url = path ? `${API}/${path}` : null;
  const isPdf = path?.toLowerCase().endsWith(".pdf");
  const [blobUrl, setBlobUrl] = useState(null);

  useEffect(() => {
    if (!url || !isPdf) return;
    let objectUrl;
    fetch(url, { credentials: "include" })
      .then(r => r.blob())
      .then(blob => { objectUrl = URL.createObjectURL(blob); setBlobUrl(objectUrl); })
      .catch(() => {});
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [url, isPdf]);

  return (
    <Col md={3} className="mb-3">
      <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>{label}</div>
      {url ? (
        <>
          {isPdf ? (
            <>
              {blobUrl ? (
                <a href={url} target="_blank" rel="noreferrer" style={{ textDecoration: "none", display: "block", cursor: "pointer" }}>
                  <div style={{ width: 120, height: 120, overflow: "hidden", border: "1px solid #ddd", borderRadius: 4 }}>
                    <iframe
                      src={blobUrl}
                      title={label}
                      style={{ width: "calc(100% + 20px)", height: "100%", border: "none", display: "block", pointerEvents: "none" }}
                    />
                  </div>
                </a>
              ) : (
                <div style={{ width: 120, height: 120, border: "1px solid #ddd", borderRadius: 4, background: "#fafafa", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 11, color: "#999" }}>Loading…</span>
                </div>
              )}
              <a href={url} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-primary mt-1" style={{ fontSize: 11 }}>
                View PDF
              </a>
            </>
          ) : (
            <a href={url} target="_blank" rel="noreferrer">
              <img src={url} alt={label} style={{ maxWidth: 120, border: "1px solid #ddd", borderRadius: 4, display: "block" }} />
            </a>
          )}
        </>
      ) : (
        <span className="text-muted">Not uploaded</span>
      )}
    </Col>
  );
};

const CandidateProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { adminData } = useContext(AuthContext);

  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("1");

  useEffect(() => {
    getCandidateById(id)
      .then((r) => setCandidate(r.data.data))
      .catch(() => toast.error("Failed to load candidate"))
      .finally(() => setLoading(false));
  }, [id]);

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN") : "—";

  document.title = `Candidate Profile | ${adminData?.companyName}`;

  if (loading) return <div className="page-content text-center py-5"><span className="spinner-border"></span></div>;
  if (!candidate) return <div className="page-content text-center py-5 text-danger">Candidate not found</div>;

  const c = candidate;

  return (
    <div className="page-content">
      <Container fluid>
        <BreadCrumb maintitle="Recruitment" title="Candidate Profile" pageTitle="Candidates" />
        <Card>
          <CardHeader className="d-flex align-items-center justify-content-between">
            <div>
              <h5 className="mb-1">{c.name}</h5>
              <span className="text-muted" style={{ fontFamily: "monospace", fontSize: 13 }}>{c.registration_id}</span>
              {" "}<Badge color={c.otr_status === "complete" ? "success" : "warning"} className="ms-2">{c.otr_status}</Badge>
            </div>
            <Button color="secondary" size="sm" onClick={() => navigate("/candidates")}>Back to List</Button>
          </CardHeader>
          <CardBody>
            <Nav tabs className="mb-3">
              {["Personal","Contact","Documents","Other"].map((label, i) => (
                <NavItem key={i}>
                  <NavLink className={classnames({ active: activeTab === String(i + 1) })} onClick={() => setActiveTab(String(i + 1))} style={{ cursor: "pointer" }}>
                    {label}
                  </NavLink>
                </NavItem>
              ))}
            </Nav>
            <TabContent activeTab={activeTab}>
              <TabPane tabId="1">
                <Row>
                  <Field label="Full Name" value={c.name} />
                  <Field label="Father / Husband Name" value={c.father_husband_name} />
                  <Field label="Date of Birth" value={fmtDate(c.dob)} />
                  <Field label="Gender" value={c.gender} />
                  <Field label="Category" value={c.category} />
                  {c.caste_cert_no && <Field label="Caste Certificate No." value={c.caste_cert_no} />}
                  <Field label="Marital Status" value={c.marital_status} />
                </Row>
              </TabPane>
              <TabPane tabId="2">
                <Row>
                  <Col md={6} className="mb-3">
                    <div style={{ fontSize: 11, color: "#888", marginBottom: 2 }}>Mobile</div>
                    <div style={{ fontWeight: 500 }}>{c.mobile || "—"}</div>
                  </Col>
                  <Col md={6} className="mb-3">
                    <div style={{ fontSize: 11, color: "#888", marginBottom: 2 }}>Email</div>
                    <div style={{ fontWeight: 500 }}>{c.email || "—"}</div>
                  </Col>
                  <Col md={6} className="mb-3">
                    <div style={{ fontSize: 11, color: "#888", marginBottom: 2 }}>Permanent Address</div>
                    <div style={{ fontWeight: 500 }}>
                      {[c.address_permanent?.line1, c.address_permanent?.line2, c.address_permanent?.taluka, c.address_permanent?.district, c.address_permanent?.pincode].filter(Boolean).join(", ") || "—"}
                    </div>
                  </Col>
                  <Col md={6} className="mb-3">
                    <div style={{ fontSize: 11, color: "#888", marginBottom: 2 }}>Current Address</div>
                    <div style={{ fontWeight: 500 }}>
                      {c.address_current?.same_as_permanent
                        ? "Same as permanent"
                        : [c.address_current?.line1, c.address_current?.line2, c.address_current?.taluka, c.address_current?.district, c.address_current?.pincode].filter(Boolean).join(", ") || "—"}
                    </div>
                  </Col>
                </Row>
              </TabPane>
              <TabPane tabId="3">
                <Row>
                  <CertViewer label="Photo" path={c.photo_path} />
                  <CertViewer label="Signature" path={c.signature_path} />
                  {c.caste_cert_path && <CertViewer label="Caste Certificate" path={c.caste_cert_path} />}
                  {c.ph_status && <CertViewer label="UDID Certificate" path={c.udid_cert_path} />}
                </Row>
              </TabPane>
              <TabPane tabId="4">
                <Row>
                  <Field label="PH Status" value={c.ph_status ? "Yes" : "No"} />
                  <Field label="PH Type" value={c.ph_type} />
                  <Field label="PH Percentage" value={c.ph_percentage ? `${c.ph_percentage}%` : null} />
                  <Field label="Ex-Serviceman" value={c.ex_serviceman ? "Yes" : "No"} />
                  <Field label="Qualification" value={c.qualification} />
                  <Col md={12} className="mb-3">
                    <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>Languages</div>
                    {c.languages?.length ? (
                      <table className="table table-sm table-bordered" style={{ maxWidth: 400 }}>
                        <thead><tr><th>Language</th><th>Read</th><th>Write</th><th>Speak</th></tr></thead>
                        <tbody>
                          {c.languages.map((l, i) => (
                            <tr key={i}>
                              <td>{l.language}</td>
                              <td>{l.read ? "✓" : "—"}</td>
                              <td>{l.write ? "✓" : "—"}</td>
                              <td>{l.speak ? "✓" : "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : <span className="text-muted">None</span>}
                  </Col>
                </Row>
              </TabPane>
            </TabContent>
          </CardBody>
        </Card>
      </Container>
    </div>
  );
};

export default CandidateProfile;
