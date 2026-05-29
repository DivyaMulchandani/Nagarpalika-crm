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
                  <Field label="Gender" value={c.gender?.label} />
                  <Field label="Category" value={c.category?.label} />
                  <Field label="Nationality" value={c.nationality} />
                  <Field label="Religion" value={c.religion} />
                  <Field label="Marital Status" value={c.marital_status?.label} />
                </Row>
              </TabPane>
              <TabPane tabId="2">
                <Row>
                  <Field label="Mobile" value={c.mobile} />
                  <Field label="Email" value={c.email} />
                  <Col md={6} className="mb-3">
                    <div style={{ fontSize: 11, color: "#888", marginBottom: 2 }}>Permanent Address</div>
                    <div style={{ fontWeight: 500 }}>
                      {[c.permanent_address?.line1, c.permanent_address?.line2, c.permanent_address?.city, c.permanent_address?.state, c.permanent_address?.pincode].filter(Boolean).join(", ") || "—"}
                    </div>
                  </Col>
                  <Col md={6} className="mb-3">
                    <div style={{ fontSize: 11, color: "#888", marginBottom: 2 }}>Current Address</div>
                    <div style={{ fontWeight: 500 }}>
                      {c.same_as_permanent
                        ? "Same as permanent"
                        : [c.current_address?.line1, c.current_address?.line2, c.current_address?.city, c.current_address?.state, c.current_address?.pincode].filter(Boolean).join(", ") || "—"}
                    </div>
                  </Col>
                </Row>
              </TabPane>
              <TabPane tabId="3">
                <Row>
                  <Col md={3} className="mb-3">
                    <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>Photo</div>
                    {c.photo_path
                      ? <img src={`/api/v1/candidates/${id}/photo`} alt="candidate" style={{ maxWidth: 120, border: "1px solid #ddd", borderRadius: 4 }} />
                      : <span className="text-muted">Not uploaded</span>}
                  </Col>
                  <Col md={3} className="mb-3">
                    <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>Signature</div>
                    {c.signature_path
                      ? <img src={`/api/v1/candidates/${id}/signature`} alt="signature" style={{ maxWidth: 120, border: "1px solid #ddd", borderRadius: 4 }} />
                      : <span className="text-muted">Not uploaded</span>}
                  </Col>
                </Row>
              </TabPane>
              <TabPane tabId="4">
                <Row>
                  <Field label="PH Status" value={c.is_ph ? "Yes" : "No"} />
                  <Field label="PH Type" value={c.ph_type?.label} />
                  <Field label="PH Percentage" value={c.ph_percentage ? `${c.ph_percentage}%` : null} />
                  <Field label="Ex-Serviceman" value={c.is_ex_serviceman ? "Yes" : "No"} />
                  <Field label="Qualification" value={c.qualification?.label} />
                  <Col md={12} className="mb-3">
                    <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>Languages</div>
                    {c.languages?.length ? (
                      <table className="table table-sm table-bordered" style={{ maxWidth: 400 }}>
                        <thead><tr><th>Language</th><th>Read</th><th>Write</th><th>Speak</th></tr></thead>
                        <tbody>
                          {c.languages.map((l, i) => (
                            <tr key={i}>
                              <td>{l.language}</td>
                              <td>{l.can_read ? "✓" : "—"}</td>
                              <td>{l.can_write ? "✓" : "—"}</td>
                              <td>{l.can_speak ? "✓" : "—"}</td>
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
