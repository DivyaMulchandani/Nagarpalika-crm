import React, { useState, useEffect, useContext, useCallback } from "react";
import {
  Container, Row, Col, Card, CardBody, CardHeader,
  Badge, Button, Spinner, Input, Label, Nav, NavItem, NavLink,
  TabContent, TabPane, Modal, ModalHeader, ModalBody, ModalFooter,
} from "reactstrap";
import { useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { getAppointmentById, updateAppointment, updateAppointmentStatus } from "../../api/appointments.api";
import { getMasterData } from "../../api/masterData.api";
import { getAllDoctors } from "../../api/doctors.api";
import Select from "react-select";
import { toast } from "react-toastify";
import classnames from "classnames";
import PrescriptionPanel from "./PrescriptionPanel";
import PatientHistoryDrawer from "./PatientHistoryDrawer";

const statusColors = {
  scheduled: "primary",
  confirmed: "info",
  arrived: "warning",
  in_consultation: "secondary",
  completed: "success",
  checked_out: "dark",
};

const DoctorConsultation = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { adminData } = useContext(AuthContext);

  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("vitals");

  // Clinical data state
  const [vitals, setVitals] = useState({
    bloodPressure: "", pulseRate: "", temperature: "",
    spO2: "", weight: "", height: "", bloodSugar: "",
  });
  const [chiefComplaints, setChiefComplaints] = useState([]);
  const [diagnosis, setDiagnosis] = useState([]);
  const [procedures, setProcedures] = useState([]);
  const [clinicalNotes, setClinicalNotes] = useState([]);
  const [followUp, setFollowUp] = useState({
    nextAppointmentDate: "",
    nextAppointmentReason: "",
    nextAppointmentNotes: "",
    nextAppointmentUrgency: "routine",
    nextAppointmentDoctorId: "",
  });

  // Master data lists
  const [complaintList, setComplaintList] = useState([]);
  const [diagnosisList, setDiagnosisList] = useState([]);
  const [procedureList, setProcedureList] = useState([]);
  const [noteTypeList, setNoteTypeList] = useState([]);
  const [doctorList, setDoctorList] = useState([]);

  // Completion modal
  const [completeModal, setCompleteModal] = useState(false);

  // Patient history drawer
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    fetchAppointment();
    fetchMasterData();
    // Fetch doctor list for follow-up doctor selector
    getAllDoctors()
      .then((res) => { if (res.data.isOk) setDoctorList(res.data.data || []); })
      .catch(() => {});
  }, [id]);

  const fetchAppointment = async () => {
    setLoading(true);
    try {
      const res = await getAppointmentById(id);
      if (res.data.isOk) {
        const a = res.data.data;
        setAppointment(a);

        // Populate existing clinical data
        if (a.vitals) {
          setVitals({
            bloodPressure: a.vitals.bloodPressure || "",
            pulseRate: a.vitals.pulseRate || "",
            temperature: a.vitals.temperature || "",
            spO2: a.vitals.spO2 || "",
            weight: a.vitals.weight || "",
            height: a.vitals.height || "",
            bloodSugar: a.vitals.bloodSugar || "",
          });
        }
        if (a.chiefComplaints?.length) {
          setChiefComplaints(a.chiefComplaints.map((c) => c._id || c));
        }
        if (a.diagnosis?.length) {
          setDiagnosis(a.diagnosis.map((d) => ({
            diagnosisId: d.diagnosisId?._id || d.diagnosisId || "",
            diagnosisLabel: d.diagnosisId?.label || "",
            notes: d.notes || "",
          })));
        }
        if (a.procedures?.length) {
          setProcedures(a.procedures.map((p) => ({
            procedureId: p.procedureId?._id || p.procedureId || "",
            procedureLabel: p.procedureId?.label || "",
            quantity: p.quantity || 1,
            cost: p.cost || 0,
            toothNumber: p.toothNumber || "",
            notes: p.notes || "",
          })));
        }
        if (a.clinicalNotes?.length) {
          setClinicalNotes(a.clinicalNotes.map((n) => ({
            noteTypeId: n.noteTypeId?._id || n.noteTypeId || "",
            noteTypeLabel: n.noteTypeId?.label || "",
            content: n.content || "",
          })));
        }
        if (a.nextAppointmentDate) {
          setFollowUp({
            nextAppointmentDate: a.nextAppointmentDate ? new Date(a.nextAppointmentDate).toISOString().split("T")[0] : "",
            nextAppointmentReason: a.nextAppointmentReason || "",
            nextAppointmentNotes: a.nextAppointmentNotes || "",
            nextAppointmentUrgency: a.nextAppointmentUrgency || "routine",
            nextAppointmentDoctorId: a.nextAppointmentDoctorId?._id || a.nextAppointmentDoctorId || "",
          });
        }

        // Auto-transition to in_consultation if arrived
        if (a.status === "arrived" || a.status === "confirmed") {
          try {
            await updateAppointmentStatus(id, { status: "in_consultation" });
            setAppointment((prev) => ({ ...prev, status: "in_consultation" }));
          } catch { /* ignore */ }
        }
      }
    } catch (err) {
      toast.error("Failed to load appointment");
      navigate("/dashboard");
    }
    setLoading(false);
  };

  const fetchMasterData = async () => {
    const categories = [
      { key: "CHIEF_COMPLAINT", setter: setComplaintList },
      { key: "DIAGNOSIS", setter: setDiagnosisList },
      { key: "PROCEDURE", setter: setProcedureList },
      { key: "CLINICAL_NOTE_TYPE", setter: setNoteTypeList },
    ];
    for (const { key, setter } of categories) {
      try {
        const res = await getMasterData({ category: key, isActive: true });
        if (res.data.isOk) setter(res.data.data || []);
      } catch { /* ignore */ }
    }
  };

  const patient = appointment?.patientId;
  const doctor = appointment?.doctorId;
  const patientName = patient ? `${patient.firstName || ""} ${patient.lastName || ""}`.trim() : "-";
  const patientAge = patient?.dateOfBirth
    ? `${Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} yrs`
    : "-";

  // ---- Save clinical data ----
  const handleSave = async (showToast = true) => {
    setSaving(true);
    try {
      const payload = {
        vitals,
        chiefComplaints,
        diagnosis: diagnosis.map((d) => ({ diagnosisId: d.diagnosisId, notes: d.notes })),
        procedures: procedures.map((p) => ({
          procedureId: p.procedureId,
          quantity: p.quantity,
          cost: p.cost,
          toothNumber: p.toothNumber,
          notes: p.notes,
        })),
        clinicalNotes: clinicalNotes.map((n) => ({
          noteTypeId: n.noteTypeId || undefined,
          content: n.content,
        })),
        nextAppointmentDate: followUp.nextAppointmentDate || undefined,
        nextAppointmentReason: followUp.nextAppointmentReason,
        nextAppointmentNotes: followUp.nextAppointmentNotes,
        nextAppointmentUrgency: followUp.nextAppointmentUrgency,
        nextAppointmentDoctorId: followUp.nextAppointmentDoctorId || undefined,
      };

      const res = await updateAppointment(id, payload);
      if (res.data.isOk && showToast) {
        toast.success("Saved successfully");
      }
    } catch (err) {
      toast.error("Failed to save");
    }
    setSaving(false);
  };

  // ---- Complete consultation ----
  const handleComplete = async () => {
    await handleSave(false);
    try {
      const res = await updateAppointmentStatus(id, { status: "completed" });
      if (res.data.isOk) {
        toast.success("Consultation completed");
        setCompleteModal(false);
        navigate("/dashboard");
      } else {
        toast.error(res.data.message || "Cannot complete consultation");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to complete");
    }
  };

  // ---- Helpers for dynamic rows ----
  const addDiagnosis = () => setDiagnosis([...diagnosis, { diagnosisId: "", diagnosisLabel: "", notes: "" }]);
  const removeDiagnosis = (i) => setDiagnosis(diagnosis.filter((_, idx) => idx !== i));

  const addProcedure = () => setProcedures([...procedures, { procedureId: "", procedureLabel: "", quantity: 1, cost: 0, toothNumber: "", notes: "" }]);
  const removeProcedure = (i) => setProcedures(procedures.filter((_, idx) => idx !== i));

  const addNote = () => setClinicalNotes([...clinicalNotes, { noteTypeId: "", noteTypeLabel: "", content: "" }]);
  const removeNote = (i) => setClinicalNotes(clinicalNotes.filter((_, idx) => idx !== i));

  const totalCost = procedures.reduce((sum, p) => sum + (p.cost || 0) * (p.quantity || 1), 0);

  if (loading) {
    return (
      <div className="page-content">
        <Container fluid>
          <div className="text-center py-5"><Spinner color="primary" /></div>
        </Container>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="page-content">
        <Container fluid>
          <div className="text-center py-5 text-muted">Appointment not found</div>
        </Container>
      </div>
    );
  }

  const isCompleted = ["completed", "checked_out"].includes(appointment.status);

  return (
    <div className="page-content">
      <Container fluid>
        {/* Header */}
        <Row className="mb-3">
          <Col>
            <div className="d-flex align-items-center gap-3">
              <Button color="light" size="sm" onClick={() => navigate("/dashboard")}>
                <i className="ri-arrow-left-line"></i>
              </Button>
              <div>
                <h4 className="mb-0">
                  Consultation — {patientName}
                </h4>
                <small className="text-muted">
                  {new Date(appointment.appointmentDate).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}
                  {" · "}{appointment.startTime} – {appointment.endTime || ""}
                </small>
              </div>
              <Badge color={statusColors[appointment.status] || "secondary"} className="text-capitalize ms-auto">
                {appointment.status?.replace(/_/g, " ")}
              </Badge>
            </div>
          </Col>
        </Row>

        <Row>
          {/* Patient Info Sidebar */}
          <Col lg={3}>
            <Card className="sticky-top" style={{ top: "80px" }}>
              <CardHeader className="py-2">
                <h6 className="mb-0"><i className="ri-user-heart-line me-2 text-primary"></i>Patient</h6>
              </CardHeader>
              <CardBody className="py-3">
                <div className="mb-2">
                  <strong>{patientName}</strong>
                  <div className="text-muted" style={{ fontSize: "12px" }}>
                    {patient?.patientId || ""} · {patient?.gender || ""} · {patientAge}
                  </div>
                </div>
                <div style={{ fontSize: "13px" }}>
                  <div><i className="ri-phone-line me-1 text-muted"></i>{patient?.mobileNumber || "-"}</div>
                  {patient?.email && <div><i className="ri-mail-line me-1 text-muted"></i>{patient.email}</div>}
                  {patient?.bloodGroup && <div><i className="ri-drop-line me-1 text-danger"></i>{patient.bloodGroup}</div>}
                  {patient?.allergies && patient.allergies.length > 0 && (
                    <div className="mt-2">
                      <Badge color="soft-danger">
                        Allergies: {patient.allergies.map((a) => a.allergyTypeId?.label || a.notes || "Unknown").join(", ")}
                      </Badge>
                    </div>
                  )}
                  <div className="mt-2">
                    <Button color="soft-info" size="sm" className="w-100" onClick={() => setHistoryOpen(true)}>
                      <i className="ri-history-line me-1"></i>Patient History
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Doctor Info */}
            <Card>
              <CardBody className="py-3">
                <div style={{ fontSize: "13px" }}>
                  <div className="fw-semibold">Dr. {doctor?.doctorName || "-"}</div>
                  <div className="text-muted">{doctor?.doctorCode || ""}</div>
                </div>
              </CardBody>
            </Card>

            {/* Quick Actions */}
            {!isCompleted && (
              <Card>
                <CardBody className="py-3">
                  <div className="d-grid gap-2">
                    <Button color="primary" onClick={handleSave} disabled={saving}>
                      <i className="ri-save-line me-1"></i>{saving ? "Saving..." : "Save Progress"}
                    </Button>
                    <Button color="success" onClick={() => setCompleteModal(true)}>
                      <i className="ri-check-double-line me-1"></i>Complete Consultation
                    </Button>
                  </div>
                </CardBody>
              </Card>
            )}
          </Col>

          {/* Clinical Tabs */}
          <Col lg={9}>
            <Card>
              <CardBody>
                <Nav tabs className="mb-3">
                  {[
                    { key: "vitals", label: "Vitals", icon: "ri-heart-pulse-line" },
                    { key: "diagnosis", label: "Diagnosis", icon: "ri-stethoscope-line" },
                    { key: "procedures", label: "Procedures", icon: "ri-surgical-mask-line" },
                    { key: "prescriptions", label: "Rx", icon: "ri-capsule-line" },
                    { key: "notes", label: "Notes", icon: "ri-file-text-line" },
                    { key: "followup", label: "Follow-Up", icon: "ri-calendar-check-line" },
                  ].map((t) => (
                    <NavItem key={t.key}>
                      <NavLink
                        className={classnames({ active: activeTab === t.key })}
                        onClick={() => setActiveTab(t.key)}
                        style={{ cursor: "pointer" }}
                      >
                        <i className={`${t.icon} me-1`}></i>{t.label}
                      </NavLink>
                    </NavItem>
                  ))}
                </Nav>

                <TabContent activeTab={activeTab}>
                  {/* ---- VITALS ---- */}
                  <TabPane tabId="vitals">
                    <Row>
                      <Col md={4}>
                        <div className="mb-3">
                          <Label className="form-label">Blood Pressure</Label>
                          <Input placeholder="120/80" value={vitals.bloodPressure} onChange={(e) => setVitals({ ...vitals, bloodPressure: e.target.value })} disabled={isCompleted} />
                        </div>
                      </Col>
                      <Col md={4}>
                        <div className="mb-3">
                          <Label className="form-label">Pulse Rate (bpm)</Label>
                          <Input type="number" placeholder="72" value={vitals.pulseRate} onChange={(e) => setVitals({ ...vitals, pulseRate: e.target.value })} disabled={isCompleted} />
                        </div>
                      </Col>
                      <Col md={4}>
                        <div className="mb-3">
                          <Label className="form-label">Temperature ({"\u00B0"}F)</Label>
                          <Input type="number" step="0.1" placeholder="98.6" value={vitals.temperature} onChange={(e) => setVitals({ ...vitals, temperature: e.target.value })} disabled={isCompleted} />
                        </div>
                      </Col>
                    </Row>
                    <Row>
                      <Col md={3}>
                        <div className="mb-3">
                          <Label className="form-label">SpO2 (%)</Label>
                          <Input type="number" placeholder="98" value={vitals.spO2} onChange={(e) => setVitals({ ...vitals, spO2: e.target.value })} disabled={isCompleted} />
                        </div>
                      </Col>
                      <Col md={3}>
                        <div className="mb-3">
                          <Label className="form-label">Weight (kg)</Label>
                          <Input type="number" step="0.1" placeholder="70" value={vitals.weight} onChange={(e) => setVitals({ ...vitals, weight: e.target.value })} disabled={isCompleted} />
                        </div>
                      </Col>
                      <Col md={3}>
                        <div className="mb-3">
                          <Label className="form-label">Height (cm)</Label>
                          <Input type="number" placeholder="170" value={vitals.height} onChange={(e) => setVitals({ ...vitals, height: e.target.value })} disabled={isCompleted} />
                        </div>
                      </Col>
                      <Col md={3}>
                        <div className="mb-3">
                          <Label className="form-label">Blood Sugar (mg/dL)</Label>
                          <Input type="number" placeholder="100" value={vitals.bloodSugar} onChange={(e) => setVitals({ ...vitals, bloodSugar: e.target.value })} disabled={isCompleted} />
                        </div>
                      </Col>
                    </Row>

                    {/* Chief Complaints */}
                    <hr />
                    <Label className="form-label fw-semibold">Chief Complaints</Label>
                    <Select
                      isMulti
                      options={complaintList.map((c) => ({ value: c._id, label: c.label }))}
                      value={complaintList.filter((c) => chiefComplaints.includes(c._id)).map((c) => ({ value: c._id, label: c.label }))}
                      onChange={(opts) => setChiefComplaints(opts ? opts.map((o) => o.value) : [])}
                      isDisabled={isCompleted}
                      placeholder="Select chief complaints..."
                    />
                  </TabPane>

                  {/* ---- DIAGNOSIS ---- */}
                  <TabPane tabId="diagnosis">
                    {diagnosis.map((d, i) => (
                      <Row key={i} className="align-items-end mb-3 border-bottom pb-3">
                        <Col md={5}>
                          <Label className="form-label">Diagnosis</Label>
                          <Select
                            options={diagnosisList.map((x) => ({ value: x._id, label: x.label }))}
                            value={d.diagnosisId ? { value: d.diagnosisId, label: d.diagnosisLabel || diagnosisList.find((x) => x._id === d.diagnosisId)?.label || "" } : null}
                            onChange={(opt) => {
                              const updated = [...diagnosis];
                              updated[i] = { ...updated[i], diagnosisId: opt?.value || "", diagnosisLabel: opt?.label || "" };
                              setDiagnosis(updated);
                            }}
                            isClearable isDisabled={isCompleted}
                            placeholder="Select diagnosis..."
                          />
                        </Col>
                        <Col md={5}>
                          <Label className="form-label">Notes</Label>
                          <Input value={d.notes} onChange={(e) => { const u = [...diagnosis]; u[i] = { ...u[i], notes: e.target.value }; setDiagnosis(u); }} disabled={isCompleted} />
                        </Col>
                        <Col md={2}>
                          {!isCompleted && <Button color="soft-danger" size="sm" onClick={() => removeDiagnosis(i)}><i className="ri-delete-bin-line"></i></Button>}
                        </Col>
                      </Row>
                    ))}
                    {!isCompleted && (
                      <Button color="soft-primary" size="sm" onClick={addDiagnosis}>
                        <i className="ri-add-line me-1"></i>Add Diagnosis
                      </Button>
                    )}
                    {diagnosis.length === 0 && <p className="text-muted mt-3">No diagnosis added yet.</p>}
                  </TabPane>

                  {/* ---- PROCEDURES ---- */}
                  <TabPane tabId="procedures">
                    {procedures.map((p, i) => (
                      <Row key={i} className="align-items-end mb-3 border-bottom pb-3">
                        <Col md={3}>
                          <Label className="form-label">Procedure</Label>
                          <Select
                            options={procedureList.map((x) => ({ value: x._id, label: x.label }))}
                            value={p.procedureId ? { value: p.procedureId, label: p.procedureLabel || procedureList.find((x) => x._id === p.procedureId)?.label || "" } : null}
                            onChange={(opt) => {
                              const u = [...procedures];
                              u[i] = { ...u[i], procedureId: opt?.value || "", procedureLabel: opt?.label || "" };
                              setProcedures(u);
                            }}
                            isClearable isDisabled={isCompleted}
                          />
                        </Col>
                        <Col md={2}>
                          <Label className="form-label">Tooth #</Label>
                          <Input value={p.toothNumber} onChange={(e) => { const u = [...procedures]; u[i] = { ...u[i], toothNumber: e.target.value }; setProcedures(u); }} disabled={isCompleted} />
                        </Col>
                        <Col md={1}>
                          <Label className="form-label">Qty</Label>
                          <Input type="number" min="1" value={p.quantity} onChange={(e) => { const u = [...procedures]; u[i] = { ...u[i], quantity: Number(e.target.value) }; setProcedures(u); }} disabled={isCompleted} />
                        </Col>
                        <Col md={2}>
                          <Label className="form-label">Cost</Label>
                          <Input type="number" min="0" value={p.cost} onChange={(e) => { const u = [...procedures]; u[i] = { ...u[i], cost: Number(e.target.value) }; setProcedures(u); }} disabled={isCompleted} />
                        </Col>
                        <Col md={3}>
                          <Label className="form-label">Notes</Label>
                          <Input value={p.notes} onChange={(e) => { const u = [...procedures]; u[i] = { ...u[i], notes: e.target.value }; setProcedures(u); }} disabled={isCompleted} />
                        </Col>
                        <Col md={1}>
                          {!isCompleted && <Button color="soft-danger" size="sm" onClick={() => removeProcedure(i)}><i className="ri-delete-bin-line"></i></Button>}
                        </Col>
                      </Row>
                    ))}
                    {!isCompleted && (
                      <Button color="soft-primary" size="sm" onClick={addProcedure}>
                        <i className="ri-add-line me-1"></i>Add Procedure
                      </Button>
                    )}
                    {procedures.length > 0 && (
                      <div className="text-end mt-3">
                        <strong>Total: {"\u20B9"}{totalCost.toLocaleString("en-IN")}</strong>
                      </div>
                    )}
                    {procedures.length === 0 && <p className="text-muted mt-3">No procedures added yet.</p>}
                  </TabPane>

                  {/* ---- PRESCRIPTIONS (Standalone Entity) ---- */}
                  <TabPane tabId="prescriptions">
                    <PrescriptionPanel
                      appointmentId={id}
                      patientId={patient?._id}
                      doctorId={doctor?._id}
                      patientName={patientName}
                      doctorName={doctor?.doctorName}
                      appointmentDate={appointment.appointmentDate}
                      isCompleted={isCompleted}
                      embeddedPrescriptions={appointment.prescriptions}
                    />
                  </TabPane>

                  {/* ---- CLINICAL NOTES ---- */}
                  <TabPane tabId="notes">
                    {clinicalNotes.map((n, i) => (
                      <Row key={i} className="align-items-start mb-3 border-bottom pb-3">
                        <Col md={3}>
                          <Label className="form-label">Note Type</Label>
                          <Select
                            options={noteTypeList.map((t) => ({ value: t._id, label: t.label }))}
                            value={n.noteTypeId ? { value: n.noteTypeId, label: n.noteTypeLabel || noteTypeList.find((t) => t._id === n.noteTypeId)?.label || "" } : null}
                            onChange={(opt) => { const u = [...clinicalNotes]; u[i] = { ...u[i], noteTypeId: opt?.value || "", noteTypeLabel: opt?.label || "" }; setClinicalNotes(u); }}
                            isClearable isDisabled={isCompleted}
                          />
                        </Col>
                        <Col md={8}>
                          <Label className="form-label">Content</Label>
                          <Input type="textarea" rows="3" value={n.content} onChange={(e) => { const u = [...clinicalNotes]; u[i] = { ...u[i], content: e.target.value }; setClinicalNotes(u); }} disabled={isCompleted} />
                        </Col>
                        <Col md={1} className="mt-4">
                          {!isCompleted && <Button color="soft-danger" size="sm" onClick={() => removeNote(i)}><i className="ri-delete-bin-line"></i></Button>}
                        </Col>
                      </Row>
                    ))}
                    {!isCompleted && (
                      <Button color="soft-primary" size="sm" onClick={addNote}>
                        <i className="ri-add-line me-1"></i>Add Note
                      </Button>
                    )}
                    {clinicalNotes.length === 0 && <p className="text-muted mt-3">No clinical notes added yet.</p>}
                  </TabPane>

                  {/* ---- FOLLOW-UP ---- */}
                  <TabPane tabId="followup">
                    <Row>
                      <Col md={3}>
                        <div className="mb-3">
                          <Label className="form-label">Suggested Follow-Up Date</Label>
                          <Input type="date" value={followUp.nextAppointmentDate} onChange={(e) => setFollowUp({ ...followUp, nextAppointmentDate: e.target.value })} disabled={isCompleted} />
                        </div>
                      </Col>
                      <Col md={3}>
                        <div className="mb-3">
                          <Label className="form-label">Follow-Up Doctor</Label>
                          <Select
                            options={doctorList.map((d) => ({ value: d._id, label: `Dr. ${d.doctorName}` }))}
                            value={followUp.nextAppointmentDoctorId ? {
                              value: followUp.nextAppointmentDoctorId,
                              label: `Dr. ${doctorList.find((d) => d._id === followUp.nextAppointmentDoctorId)?.doctorName || ""}`,
                            } : null}
                            onChange={(opt) => setFollowUp({ ...followUp, nextAppointmentDoctorId: opt?.value || "" })}
                            isClearable
                            isDisabled={isCompleted}
                            placeholder="Same doctor"
                          />
                        </div>
                      </Col>
                      <Col md={3}>
                        <div className="mb-3">
                          <Label className="form-label">Reason</Label>
                          <Input value={followUp.nextAppointmentReason} onChange={(e) => setFollowUp({ ...followUp, nextAppointmentReason: e.target.value })} disabled={isCompleted} placeholder="e.g. Check healing progress" />
                        </div>
                      </Col>
                      <Col md={3}>
                        <div className="mb-3">
                          <Label className="form-label">Urgency</Label>
                          <Input type="select" value={followUp.nextAppointmentUrgency} onChange={(e) => setFollowUp({ ...followUp, nextAppointmentUrgency: e.target.value })} disabled={isCompleted}>
                            <option value="routine">Routine</option>
                            <option value="soon">Soon</option>
                            <option value="urgent">Urgent</option>
                          </Input>
                        </div>
                      </Col>
                    </Row>
                    <Row>
                      <Col md={12}>
                        <div className="mb-3">
                          <Label className="form-label">Notes for Coordinator</Label>
                          <Input type="textarea" rows="3" value={followUp.nextAppointmentNotes} onChange={(e) => setFollowUp({ ...followUp, nextAppointmentNotes: e.target.value })} disabled={isCompleted} placeholder="Any additional instructions for scheduling..." />
                        </div>
                      </Col>
                    </Row>
                    {followUp.nextAppointmentDate && (
                      <div className="alert alert-info">
                        <i className="ri-information-line me-2"></i>
                        This follow-up suggestion will appear in the Follow-Up Queue for coordinators to schedule after the consultation is completed.
                      </div>
                    )}
                  </TabPane>
                </TabContent>
              </CardBody>
            </Card>
          </Col>
        </Row>

        {/* Complete Confirmation Modal */}
        <Modal isOpen={completeModal} toggle={() => setCompleteModal(false)} centered>
          <ModalHeader toggle={() => setCompleteModal(false)}>Complete Consultation</ModalHeader>
          <ModalBody>
            <p>Are you sure you want to mark this consultation as completed?</p>
            <p className="text-muted mb-0" style={{ fontSize: "13px" }}>
              This will save all clinical data and move the appointment to &quot;Completed&quot; status.
              {followUp.nextAppointmentDate && (
                <><br /><br /><Badge color="info">Follow-up suggestion</Badge> will be sent to the coordinator queue for <strong>{followUp.nextAppointmentDate}</strong>.</>
              )}
            </p>
          </ModalBody>
          <ModalFooter>
            <Button color="light" onClick={() => setCompleteModal(false)}>Cancel</Button>
            <Button color="success" onClick={handleComplete}>
              <i className="ri-check-double-line me-1"></i>Complete
            </Button>
          </ModalFooter>
        </Modal>

        {/* Patient History Drawer */}
        <PatientHistoryDrawer
          isOpen={historyOpen}
          toggle={() => setHistoryOpen(false)}
          patientId={patient?._id}
          patientName={patientName}
          patientAge={patientAge}
          patientGender={patient?.genderId?.label || patient?.gender || ""}
          patientBloodGroup={patient?.bloodGroupId?.label || patient?.bloodGroup || ""}
          patientAllergies={patient?.allergies?.length > 0
            ? patient.allergies.map((a) => a.allergyTypeId?.label || a.notes || "Unknown").join(", ")
            : ""}
          currentDoctorId={doctor?._id}
        />
      </Container>
    </div>
  );
};

export default DoctorConsultation;
