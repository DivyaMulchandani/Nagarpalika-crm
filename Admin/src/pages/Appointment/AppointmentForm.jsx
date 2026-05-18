import React, { useState, useEffect, useContext } from "react";
import {
  Card, CardBody, CardHeader, Col, Container, Row,
  Form, Input, Label, Button, Nav, NavItem, NavLink,
  TabContent, TabPane, Table, Badge,
} from "reactstrap";
import { useParams, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { createAppointment, updateAppointment, getAppointmentById, getDoctorSlots } from "../../api/appointments.api";
import { createTreatmentPlan, getPatientTreatmentPlans, acceptTreatmentPlan } from "../../api/treatmentPlans.api";
import { getAllDoctors } from "../../api/doctors.api";
import { getMasterData } from "../../api/masterData.api";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import Select from "react-select";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/AuthContext";
import { ROLES } from "../../constants/roles";
import { MenuContext } from "../../context/MenuContext";
import classnames from "classnames";

const initialState = {
  appointmentDate: "",
  startTime: "",
  endTime: "",
  slotDuration: "",
  patientId: "",
  doctorId: "",
  parentAppointmentId: "",
  appointmentTypeId: "",
  appointmentSourceId: "",
  isEmergency: false,
  isWalkIn: false,
  chiefComplaints: [],
  vitals: { bloodPressure: "", pulseRate: "", temperature: "", spO2: "", weight: "", height: "", bloodSugar: "" },
  diagnosis: [],
  procedures: [],
  prescriptions: [],
  clinicalNotes: [],
  nextAppointmentDate: "",
  nextAppointmentReason: "",
  nextAppointmentNotes: "",
  nextAppointmentUrgency: "routine",
  nextAppointmentDoctorId: "",
  discountType: "",
  discountValue: 0,
};

const AppointmentForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { adminData } = useContext(AuthContext);
  const { currentPagePermissions } = useContext(MenuContext);

  const [searchParams] = useSearchParams();

  const isEdit = !!id && location.pathname.endsWith("/edit");
  const isView = !!id && !location.pathname.endsWith("/edit");
  const isDoctor = adminData?.role === ROLES.DOCTOR;

  const dateFromQuery = searchParams.get("date") || "";
  const timeFromQuery = searchParams.get("time") || "";
  const doctorFromQuery = isDoctor ? adminData?._id : (searchParams.get("doctor") || "");

  const [values, setValues] = useState({
    ...initialState,
    appointmentDate: dateFromQuery,
    startTime: timeFromQuery,
    doctorId: doctorFromQuery,
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmit, setIsSubmit] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [activeTab, setActiveTab] = useState("scheduling");

  const [doctorList, setDoctorList] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [appointmentTypes, setAppointmentTypes] = useState([]);
  const [appointmentSources, setAppointmentSources] = useState([]);
  const [chiefComplaintList, setChiefComplaintList] = useState([]);
  const [diagnosisList, setDiagnosisList] = useState([]);
  const [procedureList, setProcedureList] = useState([]);
  const [frequencyList, setFrequencyList] = useState([]);
  const [dosageUnitList, setDosageUnitList] = useState([]);
  const [durationUnitList, setDurationUnitList] = useState([]);
  const [noteTypeList, setNoteTypeList] = useState([]);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [patientOptions, setPatientOptions] = useState([]);

  // Treatment Plan state
  const [patientPlans, setPatientPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [newPlan, setNewPlan] = useState({ planName: "", description: "", milestones: [] });
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [planSubmitting, setPlanSubmitting] = useState(false);

  useEffect(() => {
    getAllDoctors().then((res) => { if (res.data.isOk) setDoctorList(res.data.data || []); }).catch(() => {});
    const cats = [
      { cat: "APPOINTMENT_TYPE", setter: setAppointmentTypes },
      { cat: "APPOINTMENT_SOURCE", setter: setAppointmentSources },
      { cat: "CHIEF_COMPLAINT", setter: setChiefComplaintList },
      { cat: "DIAGNOSIS", setter: setDiagnosisList },
      { cat: "PROCEDURE", setter: setProcedureList },
      { cat: "MEDICINE_FREQUENCY", setter: setFrequencyList },
      { cat: "MEDICINE_DOSAGE_UNIT", setter: setDosageUnitList },
      { cat: "MEDICINE_DURATION_UNIT", setter: setDurationUnitList },
      { cat: "CLINICAL_NOTE_TYPE", setter: setNoteTypeList },
    ];
    cats.forEach(({ cat, setter }) => {
      getMasterData({ category: cat, isActive: true })
        .then((res) => { if (res.data.isOk) setter(res.data.data || []); })
        .catch(() => {});
    });
  }, []);

  useEffect(() => {
    if (id) {
      setIsFetching(true);
      getAppointmentById(id)
        .then((res) => {
          const a = res.data.data;
          setValues({
            appointmentDate: a.appointmentDate ? new Date(a.appointmentDate).toISOString().split("T")[0] : "",
            startTime: a.startTime || "",
            endTime: a.endTime || "",
            slotDuration: a.slotDuration || "",
            patientId: a.patientId?._id || a.patientId || "",
            doctorId: a.doctorId?._id || a.doctorId || "",
            parentAppointmentId: a.parentAppointmentId?._id || a.parentAppointmentId || "",
            appointmentTypeId: a.appointmentTypeId?._id || a.appointmentTypeId || "",
            appointmentSourceId: a.appointmentSourceId?._id || a.appointmentSourceId || "",
            isEmergency: !!a.isEmergency,
            isWalkIn: !!a.isWalkIn,
            chiefComplaints: (a.chiefComplaints || []).map((c) => c._id || c),
            vitals: a.vitals || initialState.vitals,
            diagnosis: a.diagnosis || [],
            procedures: a.procedures || [],
            prescriptions: a.prescriptions || [],
            clinicalNotes: a.clinicalNotes || [],
            nextAppointmentDate: a.nextAppointmentDate ? new Date(a.nextAppointmentDate).toISOString().split("T")[0] : "",
            nextAppointmentReason: a.nextAppointmentReason || "",
            nextAppointmentNotes: a.nextAppointmentNotes || "",
            nextAppointmentUrgency: a.nextAppointmentUrgency || "routine",
            nextAppointmentDoctorId: a.nextAppointmentDoctorId?._id || a.nextAppointmentDoctorId || "",
            discountType: a.discountType || "",
            discountValue: a.discountValue || 0,
          });
          if (a.doctorId) {
            const d = a.doctorId;
            setSelectedDoctor(d._id ? { value: d._id, label: d.doctorName } : null);
          }
          if (a.patientId) {
            const p = a.patientId;
            if (p._id) {
              setSelectedPatient({ value: p._id, label: `${p.firstName || ""} ${p.lastName || ""} (${p.patientId || ""})` });
            }
          }
        })
        .catch(() => toast.error("Failed to fetch appointment details"))
        .finally(() => setIsFetching(false));
    }
  }, [id]);

  useEffect(() => {
    if (doctorFromQuery && doctorList.length > 0) {
      const doc = doctorList.find((d) => d._id === doctorFromQuery);
      if (doc) {
        setSelectedDoctor({ value: doc._id, label: doc.doctorName });
        setValues((prev) => ({ ...prev, doctorId: doc._id }));
      }
    }
  }, [doctorList, doctorFromQuery]);

  useEffect(() => {
    const pid = values.patientId;
    if (pid) {
      setPlansLoading(true);
      getPatientTreatmentPlans(pid)
        .then((res) => { if (res.data.isOk) setPatientPlans(res.data.data || []); })
        .catch(() => {})
        .finally(() => setPlansLoading(false));
    } else {
      setPatientPlans([]);
    }
  }, [values.patientId]);

  // Auto-fill slot duration from doctor's settings when doctor is selected
  useEffect(() => {
    if (values.doctorId && doctorList.length > 0 && !isEdit && !isView) {
      const doc = doctorList.find((d) => d._id === values.doctorId);
      if (doc?.slotDurationId) {
        const durationVal = doc.slotDurationId?.label || doc.slotDurationId?.code || "";
        const durationMins = parseInt(durationVal, 10);
        if (durationMins > 0 && !values.slotDuration) {
          setValues((prev) => ({ ...prev, slotDuration: durationMins }));
        }
      }
    }
  }, [values.doctorId, doctorList]);

  // Auto-compute endTime when startTime or slotDuration changes
  useEffect(() => {
    if (values.startTime && values.slotDuration && !isView) {
      const [h, m] = values.startTime.split(":").map(Number);
      const totalMins = h * 60 + m + Number(values.slotDuration);
      const endH = String(Math.floor(totalMins / 60) % 24).padStart(2, "0");
      const endM = String(totalMins % 60).padStart(2, "0");
      const computedEnd = `${endH}:${endM}`;
      if (computedEnd !== values.endTime) {
        setValues((prev) => ({ ...prev, endTime: computedEnd }));
      }
    }
  }, [values.startTime, values.slotDuration]);

  useEffect(() => {
    if (values.doctorId && values.appointmentDate) {
      getDoctorSlots({ doctorId: values.doctorId, date: values.appointmentDate })
        .then((res) => { if (res.data.isOk) setBookedSlots(res.data.data || []); })
        .catch(() => {});
    }
  }, [values.doctorId, values.appointmentDate]);

  useEffect(() => {
    if (patientSearch.length >= 2) {
      import("../../api/patients.api").then((mod) => {
        const searchFn = mod.searchPatients || mod.default?.searchPatients;
        if (searchFn) {
          searchFn({ skip: 0, per_page: 20, match: patientSearch, isActive: true, isDeleted: false })
            .then((res) => {
              if (res.data.data && res.data.data.length > 0) {
                setPatientOptions((res.data.data[0].data || []).map((p) => ({
                  value: p._id,
                  label: `${p.firstName || ""} ${p.lastName || ""} (${p.patientId || ""}) - ${p.mobileNumber || ""}`,
                })));
              } else {
                setPatientOptions([]);
              }
            })
            .catch(() => {});
        }
      });
    }
  }, [patientSearch]);

  const validate = (v) => {
    const errors = {};
    if (!v.appointmentDate) errors.appointmentDate = "Date is required!";
    if (!v.startTime) errors.startTime = "Start time is required!";
    if (!v.patientId) errors.patientId = "Patient is required!";
    if (!v.doctorId) errors.doctorId = "Doctor is required!";
    return errors;
  };

  const handleChange = (e) => setValues({ ...values, [e.target.name]: e.target.value });
  const handleCheck = (e) => setValues({ ...values, [e.target.name]: e.target.checked });
  const handleVitals = (e) => setValues({ ...values, vitals: { ...values.vitals, [e.target.name]: e.target.value } });

  const addDiagnosis = () => setValues({ ...values, diagnosis: [...values.diagnosis, { diagnosisId: "", notes: "" }] });
  const updateDiagnosis = (idx, field, val) => {
    const updated = [...values.diagnosis];
    updated[idx] = { ...updated[idx], [field]: val };
    setValues({ ...values, diagnosis: updated });
  };
  const removeDiagnosis = (idx) => setValues({ ...values, diagnosis: values.diagnosis.filter((_, i) => i !== idx) });

  const addProcedure = () => setValues({ ...values, procedures: [...values.procedures, { procedureId: "", quantity: 1, cost: 0, toothNumber: "", notes: "" }] });
  const updateProcedure = (idx, field, val) => {
    const updated = [...values.procedures];
    updated[idx] = { ...updated[idx], [field]: val };
    setValues({ ...values, procedures: updated });
  };
  const removeProcedure = (idx) => setValues({ ...values, procedures: values.procedures.filter((_, i) => i !== idx) });

  const addPrescription = () => setValues({ ...values, prescriptions: [...values.prescriptions, { medicineName: "", dosage: "", frequencyId: "", duration: "", durationUnitId: "", instructions: "" }] });
  const updatePrescription = (idx, field, val) => {
    const updated = [...values.prescriptions];
    updated[idx] = { ...updated[idx], [field]: val };
    setValues({ ...values, prescriptions: updated });
  };
  const removePrescription = (idx) => setValues({ ...values, prescriptions: values.prescriptions.filter((_, i) => i !== idx) });

  const addClinicalNote = () => setValues({ ...values, clinicalNotes: [...values.clinicalNotes, { noteTypeId: "", content: "" }] });
  const updateClinicalNote = (idx, field, val) => {
    const updated = [...values.clinicalNotes];
    updated[idx] = { ...updated[idx], [field]: val };
    setValues({ ...values, clinicalNotes: updated });
  };
  const removeClinicalNote = (idx) => setValues({ ...values, clinicalNotes: values.clinicalNotes.filter((_, i) => i !== idx) });

  // Print prescription
  const handlePrintPrescription = () => {
    const patient = selectedPatient ? selectedPatient.label : "Patient";
    const doctor = selectedDoctor ? selectedDoctor.label : "Doctor";
    const date = values.appointmentDate ? new Date(values.appointmentDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "";

    const prescriptionRows = values.prescriptions.map((p, i) => {
      const freq = frequencyList.find((f) => f._id === (p.frequencyId?._id || p.frequencyId));
      const durUnit = durationUnitList.find((u) => u._id === (p.durationUnitId?._id || p.durationUnitId));
      const dosUnit = dosageUnitList.find((u) => u._id === (p.dosageUnitId?._id || p.dosageUnitId));
      return `<tr>
        <td style="padding:8px;border:1px solid #dee2e6">${i + 1}</td>
        <td style="padding:8px;border:1px solid #dee2e6;font-weight:600">${p.medicineName || "-"}</td>
        <td style="padding:8px;border:1px solid #dee2e6">${p.dosage || "-"}${dosUnit ? " " + dosUnit.label : ""}</td>
        <td style="padding:8px;border:1px solid #dee2e6">${freq?.label || "-"}</td>
        <td style="padding:8px;border:1px solid #dee2e6">${p.duration || "-"} ${durUnit?.label || ""}</td>
        <td style="padding:8px;border:1px solid #dee2e6">${p.instructions || "-"}</td>
      </tr>`;
    }).join("");

    const html = `<!DOCTYPE html><html><head><title>Prescription</title>
      <style>body{font-family:Arial,sans-serif;margin:0;padding:20px}
      .header{text-align:center;border-bottom:2px solid #333;padding-bottom:15px;margin-bottom:20px}
      .header h2{margin:0;color:#333} .header p{margin:4px 0;color:#666;font-size:13px}
      .patient-info{display:flex;justify-content:space-between;margin-bottom:20px;padding:10px;background:#f8f9fa;border-radius:6px}
      .rx{font-size:28px;font-weight:bold;color:#0d6efd;margin:15px 0}
      table{width:100%;border-collapse:collapse;margin-bottom:20px}
      th{background:#f0f0f0;padding:8px;border:1px solid #dee2e6;text-align:left;font-size:13px}
      td{font-size:13px}
      .footer{margin-top:40px;text-align:right;padding-top:15px}
      .signature-line{border-top:1px solid #333;display:inline-block;width:200px;padding-top:5px}
      @media print{body{margin:0;padding:15px}}</style></head>
      <body>
        <div class="header">
          <h2>${adminData?.companyName || "Clinic"}</h2>
          <p>${adminData?.companyAddress || ""}</p>
        </div>
        <div class="patient-info">
          <div><strong>Patient:</strong> ${patient}</div>
          <div><strong>Date:</strong> ${date}</div>
          <div><strong>Doctor:</strong> Dr. ${doctor}</div>
        </div>
        <div class="rx">&#8478;</div>
        <table><thead><tr>
          <th>#</th><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Duration</th><th>Instructions</th>
        </tr></thead><tbody>${prescriptionRows}</tbody></table>
        <div class="footer">
          <div class="signature-line">Doctor's Signature</div>
        </div>
      </body></html>`;

    const printWindow = window.open("", "_blank");
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
  };

  // Treatment Plan handlers
  const addPlanMilestone = () => {
    setNewPlan({ ...newPlan, milestones: [...newPlan.milestones, { procedureName: "", estimatedCost: 0, suggestedDate: "", notes: "" }] });
  };
  const updatePlanMilestone = (idx, field, val) => {
    const updated = [...newPlan.milestones];
    updated[idx] = { ...updated[idx], [field]: val };
    setNewPlan({ ...newPlan, milestones: updated });
  };
  const removePlanMilestone = (idx) => {
    setNewPlan({ ...newPlan, milestones: newPlan.milestones.filter((_, i) => i !== idx) });
  };

  const handleCreatePlan = async () => {
    if (!newPlan.planName?.trim()) { toast.error("Plan name is required"); return; }
    if (newPlan.milestones.length === 0) { toast.error("Add at least one milestone"); return; }
    if (!values.patientId || !values.doctorId) { toast.error("Patient and Doctor are required"); return; }
    setPlanSubmitting(true);
    try {
      const res = await createTreatmentPlan({
        patientId: values.patientId,
        doctorId: values.doctorId,
        planName: newPlan.planName,
        description: newPlan.description,
        milestones: newPlan.milestones,
      });
      if (res.data.isOk) {
        toast.success("Treatment Plan created!");
        setNewPlan({ planName: "", description: "", milestones: [] });
        setShowPlanForm(false);
        getPatientTreatmentPlans(values.patientId)
          .then((r) => { if (r.data.isOk) setPatientPlans(r.data.data || []); }).catch(() => {});
      } else {
        toast.error(res.data.message);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to create plan");
    }
    setPlanSubmitting(false);
  };

  const handleAcceptPlan = async (planId) => {
    try {
      const res = await acceptTreatmentPlan(planId);
      if (res.data.isOk) {
        toast.success(res.data.message);
        getPatientTreatmentPlans(values.patientId)
          .then((r) => { if (r.data.isOk) setPatientPlans(r.data.data || []); }).catch(() => {});
      } else {
        toast.error(res.data.message);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to accept plan");
    }
  };

  const totalCost = values.procedures.reduce((sum, p) => sum + ((Number(p.cost) || 0) * (Number(p.quantity) || 1)), 0);
  let discountAmount = 0;
  if (values.discountType === "percentage") discountAmount = totalCost * (Number(values.discountValue) / 100);
  else if (values.discountType === "fixed") discountAmount = Number(values.discountValue);
  const netAmount = Math.max(0, totalCost - discountAmount);

  const handleSubmit = (e) => {
    e.preventDefault();
    const errors = validate(values);
    setFormErrors(errors);
    setIsSubmit(true);
    if (Object.keys(errors).length > 0) return;

    setIsLoading(true);
    const payload = {
      ...values,
      totalCost,
      netAmount,
      diagnosis: values.diagnosis.map((d) => ({ diagnosisId: d.diagnosisId?._id || d.diagnosisId || undefined, notes: d.notes })),
      procedures: values.procedures.map((p) => ({
        procedureId: p.procedureId?._id || p.procedureId || undefined,
        quantity: Number(p.quantity) || 1,
        cost: Number(p.cost) || 0,
        toothNumber: p.toothNumber,
        notes: p.notes,
      })),
      prescriptions: values.prescriptions.map((p) => ({
        medicineName: p.medicineName,
        dosage: p.dosage,
        frequencyId: p.frequencyId?._id || p.frequencyId || undefined,
        duration: Number(p.duration) || undefined,
        durationUnitId: p.durationUnitId?._id || p.durationUnitId || undefined,
        instructions: p.instructions,
      })),
      clinicalNotes: values.clinicalNotes.map((n) => ({
        noteTypeId: n.noteTypeId?._id || n.noteTypeId || undefined,
        content: n.content,
      })),
    };

    const action = isEdit ? updateAppointment(id, payload) : createAppointment(payload);
    action
      .then((res) => {
        if (res.data.isOk) {
          toast.success(isEdit ? "Appointment Updated!" : "Appointment Created!");
          navigate("/appointments");
        } else {
          toast.error(res.data.message || "Failed");
        }
      })
      .catch((err) => toast.error(err?.response?.data?.message || "Failed. Please try again."))
      .finally(() => setIsLoading(false));
  };

  const title = isEdit ? "Edit Appointment" : isView ? "View Appointment" : "New Appointment";
  document.title = `${title} | ${adminData?.companyName}`;

  const masterToOptions = (list) => list.map((m) => ({ value: m._id, label: m.label }));

  return (
    <div className="page-content">
      <Container fluid>
        <BreadCrumb maintitle="Appointments" title={title} pageTitle="Appointments" />
        <Row>
          <Col lg={12}>
            <Card>
              <CardHeader className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">{title}</h5>
                {isView && currentPagePermissions.edit && (
                  <Button color="success" size="sm" onClick={() => navigate(`/appointments/${id}/edit`)}>
                    <i className="ri-edit-line me-1"></i>Edit
                  </Button>
                )}
              </CardHeader>
              <CardBody>
                {isFetching ? (
                  <div className="text-center py-4"><span className="spinner-border spinner-border-sm"></span></div>
                ) : (
                  <Form>
                    <Nav tabs className="mb-3">
                      {["scheduling", "clinical", "prescriptions", "notes", "followup", "treatmentplan", "billing"].map((tab) => (
                        <NavItem key={tab}>
                          <NavLink className={classnames({ active: activeTab === tab })} onClick={() => setActiveTab(tab)} href="#">
                            {
                              { scheduling: "Scheduling", clinical: "Clinical", prescriptions: "Prescriptions", notes: "Notes", followup: "Follow-Up", treatmentplan: "Treatment Plan", billing: "Billing" }[tab]
                            }
                          </NavLink>
                        </NavItem>
                      ))}
                    </Nav>

                    <TabContent activeTab={activeTab}>
                      {/* SCHEDULING TAB */}
                      <TabPane tabId="scheduling">
                        <Row>
                          <Col md={6}>
                            <div className="mb-3">
                              <Label>Patient <span className="text-danger">*</span></Label>
                              <Select
                                options={patientOptions}
                                value={selectedPatient}
                                onInputChange={(val) => setPatientSearch(val)}
                                onChange={(opt) => { setSelectedPatient(opt); setValues({ ...values, patientId: opt ? opt.value : "" }); }}
                                isClearable
                                isDisabled={isView}
                                placeholder="Search patient by name, phone, ID..."
                              />
                              {isSubmit && formErrors.patientId && <p className="text-danger mt-1">{formErrors.patientId}</p>}
                            </div>
                          </Col>
                          <Col md={6}>
                            <div className="mb-3">
                              <Label>Doctor <span className="text-danger">*</span></Label>
                              <Select
                                options={doctorList.map((d) => ({ value: d._id, label: d.doctorName }))}
                                value={selectedDoctor}
                                onChange={(opt) => { setSelectedDoctor(opt); setValues({ ...values, doctorId: opt ? opt.value : "" }); }}
                                isClearable={!isDoctor}
                                isDisabled={isView || isDoctor}
                                placeholder="Select doctor"
                              />
                              {isSubmit && formErrors.doctorId && <p className="text-danger mt-1">{formErrors.doctorId}</p>}
                            </div>
                          </Col>
                        </Row>
                        <Row>
                          <Col md={3}>
                            <div className="form-floating mb-3">
                              <Input type="date" name="appointmentDate" value={values.appointmentDate} onChange={handleChange} disabled={isView} placeholder="Date" />
                              <Label>Date <span className="text-danger">*</span></Label>
                              {isSubmit && formErrors.appointmentDate && <p className="text-danger">{formErrors.appointmentDate}</p>}
                            </div>
                          </Col>
                          <Col md={3}>
                            <div className="form-floating mb-3">
                              <Input type="time" name="startTime" value={values.startTime} onChange={handleChange} disabled={isView} placeholder="Start" />
                              <Label>Start Time <span className="text-danger">*</span></Label>
                              {isSubmit && formErrors.startTime && <p className="text-danger">{formErrors.startTime}</p>}
                            </div>
                          </Col>
                          <Col md={3}>
                            <div className="form-floating mb-3">
                              <Input type="time" name="endTime" value={values.endTime} onChange={handleChange} disabled={isView} placeholder="End" />
                              <Label>End Time</Label>
                            </div>
                          </Col>
                          <Col md={3}>
                            <div className="form-floating mb-3">
                              <Input type="number" name="slotDuration" value={values.slotDuration} onChange={handleChange} disabled={isView} placeholder="Duration" />
                              <Label>Slot Duration (min)</Label>
                            </div>
                          </Col>
                        </Row>
                        <Row>
                          <Col md={4}>
                            <div className="mb-3">
                              <Label>Appointment Type</Label>
                              <Select
                                options={masterToOptions(appointmentTypes)}
                                value={appointmentTypes.filter((m) => m._id === values.appointmentTypeId).map((m) => ({ value: m._id, label: m.label }))[0] || null}
                                onChange={(opt) => setValues({ ...values, appointmentTypeId: opt ? opt.value : "" })}
                                isClearable
                                isDisabled={isView}
                                placeholder="Select type"
                              />
                            </div>
                          </Col>
                          <Col md={4}>
                            <div className="mb-3">
                              <Label>Source</Label>
                              <Select
                                options={masterToOptions(appointmentSources)}
                                value={appointmentSources.filter((m) => m._id === values.appointmentSourceId).map((m) => ({ value: m._id, label: m.label }))[0] || null}
                                onChange={(opt) => setValues({ ...values, appointmentSourceId: opt ? opt.value : "" })}
                                isClearable
                                isDisabled={isView}
                                placeholder="Select source"
                              />
                            </div>
                          </Col>
                          <Col md={4} className="d-flex align-items-center pt-3">
                            <div>
                              <Input type="checkbox" name="isEmergency" checked={values.isEmergency} onChange={handleCheck} disabled={isView} />
                              <Label className="ms-1">Emergency</Label>
                            </div>
                          </Col>
                        </Row>
                        {bookedSlots.length > 0 && (
                          <div className="mt-2 mb-3">
                            <Label className="text-muted">Booked slots for this date:</Label>
                            <div className="d-flex gap-2 flex-wrap">
                              {bookedSlots.map((s, i) => (
                                <Badge key={i} color="soft-danger" className="p-2">{s.startTime}{s.endTime ? ` - ${s.endTime}` : ""}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </TabPane>

                      {/* CLINICAL TAB */}
                      <TabPane tabId="clinical">
                        <Row>
                          <Col md={12}>
                            <div className="mb-3">
                              <Label>Chief Complaints</Label>
                              <Select
                                options={masterToOptions(chiefComplaintList)}
                                value={chiefComplaintList.filter((m) => values.chiefComplaints.includes(m._id)).map((m) => ({ value: m._id, label: m.label }))}
                                onChange={(opts) => setValues({ ...values, chiefComplaints: opts ? opts.map((o) => o.value) : [] })}
                                isMulti
                                isDisabled={isView}
                                placeholder="Select complaints"
                              />
                            </div>
                          </Col>
                        </Row>

                        <h6 className="mt-3 mb-2">Vitals</h6>
                        <Row>
                          {[
                            { name: "bloodPressure", label: "Blood Pressure", type: "text" },
                            { name: "pulseRate", label: "Pulse Rate", type: "number" },
                            { name: "temperature", label: "Temperature (°F)", type: "number" },
                            { name: "spO2", label: "SpO2 (%)", type: "number" },
                            { name: "weight", label: "Weight (kg)", type: "number" },
                            { name: "height", label: "Height (cm)", type: "number" },
                            { name: "bloodSugar", label: "Blood Sugar", type: "number" },
                          ].map((v) => (
                            <Col md={3} key={v.name}>
                              <div className="form-floating mb-3">
                                <Input type={v.type} name={v.name} value={values.vitals[v.name] || ""} onChange={handleVitals} disabled={isView} placeholder={v.label} />
                                <Label>{v.label}</Label>
                              </div>
                            </Col>
                          ))}
                        </Row>

                        <div className="d-flex justify-content-between align-items-center mt-3 mb-2">
                          <h6 className="mb-0">Diagnosis</h6>
                          {!isView && <Button color="soft-primary" size="sm" onClick={addDiagnosis}>+ Add</Button>}
                        </div>
                        {values.diagnosis.map((d, idx) => (
                          <Row key={idx} className="mb-2 align-items-end">
                            <Col md={5}>
                              <Select
                                options={masterToOptions(diagnosisList)}
                                value={diagnosisList.filter((m) => m._id === (d.diagnosisId?._id || d.diagnosisId)).map((m) => ({ value: m._id, label: m.label }))[0] || null}
                                onChange={(opt) => updateDiagnosis(idx, "diagnosisId", opt ? opt.value : "")}
                                isDisabled={isView}
                                placeholder="Select diagnosis"
                              />
                            </Col>
                            <Col md={5}>
                              <Input type="text" placeholder="Notes" value={d.notes || ""} onChange={(e) => updateDiagnosis(idx, "notes", e.target.value)} disabled={isView} />
                            </Col>
                            <Col md={2}>
                              {!isView && <Button color="danger" size="sm" onClick={() => removeDiagnosis(idx)}>Remove</Button>}
                            </Col>
                          </Row>
                        ))}

                        <div className="d-flex justify-content-between align-items-center mt-4 mb-2">
                          <h6 className="mb-0">Procedures</h6>
                          {!isView && <Button color="soft-primary" size="sm" onClick={addProcedure}>+ Add</Button>}
                        </div>
                        {values.procedures.length > 0 && (
                          <Table responsive size="sm" className="mb-0">
                            <thead>
                              <tr><th>Procedure</th><th>Qty</th><th>Cost</th><th>Tooth #</th><th>Notes</th><th></th></tr>
                            </thead>
                            <tbody>
                              {values.procedures.map((p, idx) => (
                                <tr key={idx}>
                                  <td style={{ minWidth: "200px" }}>
                                    <Select
                                      options={masterToOptions(procedureList)}
                                      value={procedureList.filter((m) => m._id === (p.procedureId?._id || p.procedureId)).map((m) => ({ value: m._id, label: m.label }))[0] || null}
                                      onChange={(opt) => updateProcedure(idx, "procedureId", opt ? opt.value : "")}
                                      isDisabled={isView}
                                      placeholder="Select"
                                      menuPortalTarget={document.body}
                                    />
                                  </td>
                                  <td><Input type="number" min="1" value={p.quantity} onChange={(e) => updateProcedure(idx, "quantity", e.target.value)} disabled={isView} style={{ width: "70px" }} /></td>
                                  <td><Input type="number" min="0" value={p.cost} onChange={(e) => updateProcedure(idx, "cost", e.target.value)} disabled={isView} style={{ width: "100px" }} /></td>
                                  <td><Input type="text" value={p.toothNumber || ""} onChange={(e) => updateProcedure(idx, "toothNumber", e.target.value)} disabled={isView} style={{ width: "80px" }} /></td>
                                  <td><Input type="text" value={p.notes || ""} onChange={(e) => updateProcedure(idx, "notes", e.target.value)} disabled={isView} /></td>
                                  <td>{!isView && <Button color="danger" size="sm" onClick={() => removeProcedure(idx)}>×</Button>}</td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>
                        )}
                      </TabPane>

                      {/* PRESCRIPTIONS TAB */}
                      <TabPane tabId="prescriptions">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <h6 className="mb-0">Prescriptions</h6>
                          <div className="d-flex gap-2">
                            {isView && values.prescriptions.length > 0 && (
                              <Button color="soft-success" size="sm" onClick={handlePrintPrescription}>
                                <i className="ri-printer-line me-1"></i>Print Prescription
                              </Button>
                            )}
                            {!isView && <Button color="soft-primary" size="sm" onClick={addPrescription}>+ Add Medicine</Button>}
                          </div>
                        </div>
                        {values.prescriptions.map((p, idx) => (
                          <Card key={idx} className="border mb-2">
                            <CardBody className="p-3">
                              <Row className="align-items-end">
                                <Col md={3}>
                                  <div className="form-floating mb-2">
                                    <Input type="text" value={p.medicineName || ""} onChange={(e) => updatePrescription(idx, "medicineName", e.target.value)} disabled={isView} placeholder="Medicine" />
                                    <Label>Medicine Name</Label>
                                  </div>
                                </Col>
                                <Col md={1}>
                                  <div className="form-floating mb-2">
                                    <Input type="text" value={p.dosage || ""} onChange={(e) => updatePrescription(idx, "dosage", e.target.value)} disabled={isView} placeholder="Dosage" />
                                    <Label>Dosage</Label>
                                  </div>
                                </Col>
                                <Col md={2}>
                                  <Label style={{ fontSize: "12px" }}>Dosage Unit</Label>
                                  <Select
                                    options={masterToOptions(dosageUnitList)}
                                    value={dosageUnitList.filter((m) => m._id === (p.dosageUnitId?._id || p.dosageUnitId)).map((m) => ({ value: m._id, label: m.label }))[0] || null}
                                    onChange={(opt) => updatePrescription(idx, "dosageUnitId", opt ? opt.value : "")}
                                    isDisabled={isView}
                                    menuPortalTarget={document.body}
                                    placeholder="Unit"
                                  />
                                </Col>
                                <Col md={2}>
                                  <Label style={{ fontSize: "12px" }}>Frequency</Label>
                                  <Select
                                    options={masterToOptions(frequencyList)}
                                    value={frequencyList.filter((m) => m._id === (p.frequencyId?._id || p.frequencyId)).map((m) => ({ value: m._id, label: m.label }))[0] || null}
                                    onChange={(opt) => updatePrescription(idx, "frequencyId", opt ? opt.value : "")}
                                    isDisabled={isView}
                                    menuPortalTarget={document.body}
                                  />
                                </Col>
                                <Col md={1}>
                                  <div className="form-floating mb-2">
                                    <Input type="number" value={p.duration || ""} onChange={(e) => updatePrescription(idx, "duration", e.target.value)} disabled={isView} placeholder="Dur" />
                                    <Label>Duration</Label>
                                  </div>
                                </Col>
                                <Col md={2}>
                                  <Label style={{ fontSize: "12px" }}>Duration Unit</Label>
                                  <Select
                                    options={masterToOptions(durationUnitList)}
                                    value={durationUnitList.filter((m) => m._id === (p.durationUnitId?._id || p.durationUnitId)).map((m) => ({ value: m._id, label: m.label }))[0] || null}
                                    onChange={(opt) => updatePrescription(idx, "durationUnitId", opt ? opt.value : "")}
                                    isDisabled={isView}
                                    menuPortalTarget={document.body}
                                  />
                                </Col>
                                <Col md={1} className="d-flex align-items-center mb-2">
                                  {!isView && <Button color="danger" size="sm" onClick={() => removePrescription(idx)}>×</Button>}
                                </Col>
                              </Row>
                              <Row>
                                <Col md={12}>
                                  <Input type="text" placeholder="Instructions (e.g. Take after meals)" value={p.instructions || ""} onChange={(e) => updatePrescription(idx, "instructions", e.target.value)} disabled={isView} />
                                </Col>
                              </Row>
                            </CardBody>
                          </Card>
                        ))}
                        {values.prescriptions.length === 0 && <p className="text-muted">No prescriptions added.</p>}
                      </TabPane>

                      {/* NOTES TAB */}
                      <TabPane tabId="notes">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <h6 className="mb-0">Clinical Notes</h6>
                          {!isView && <Button color="soft-primary" size="sm" onClick={addClinicalNote}>+ Add Note</Button>}
                        </div>
                        {values.clinicalNotes.map((n, idx) => (
                          <Row key={idx} className="mb-3">
                            <Col md={3}>
                              <Select
                                options={masterToOptions(noteTypeList)}
                                value={noteTypeList.filter((m) => m._id === (n.noteTypeId?._id || n.noteTypeId)).map((m) => ({ value: m._id, label: m.label }))[0] || null}
                                onChange={(opt) => updateClinicalNote(idx, "noteTypeId", opt ? opt.value : "")}
                                isDisabled={isView}
                                placeholder="Note Type"
                              />
                            </Col>
                            <Col md={7}>
                              <Input type="textarea" rows="2" value={n.content || ""} onChange={(e) => updateClinicalNote(idx, "content", e.target.value)} disabled={isView} placeholder="Note content..." />
                            </Col>
                            <Col md={2}>
                              {!isView && <Button color="danger" size="sm" onClick={() => removeClinicalNote(idx)}>Remove</Button>}
                            </Col>
                          </Row>
                        ))}
                        {values.clinicalNotes.length === 0 && <p className="text-muted">No clinical notes added.</p>}
                      </TabPane>

                      {/* FOLLOW-UP TAB */}
                      <TabPane tabId="followup">
                        <Row>
                          <Col md={3}>
                            <div className="form-floating mb-3">
                              <Input type="date" name="nextAppointmentDate" value={values.nextAppointmentDate} onChange={handleChange} disabled={isView} placeholder="Follow-up Date" />
                              <Label>Suggested Follow-Up Date</Label>
                            </div>
                          </Col>
                          <Col md={3}>
                            <div className="mb-3">
                              <Label>Follow-Up Doctor</Label>
                              <Select
                                options={doctorList.map((d) => ({ value: d._id, label: `Dr. ${d.doctorName}` }))}
                                value={values.nextAppointmentDoctorId ? {
                                  value: values.nextAppointmentDoctorId,
                                  label: `Dr. ${doctorList.find((d) => d._id === values.nextAppointmentDoctorId)?.doctorName || ""}`,
                                } : null}
                                onChange={(opt) => setValues({ ...values, nextAppointmentDoctorId: opt?.value || "" })}
                                isClearable
                                isDisabled={isView}
                                placeholder="Same doctor"
                              />
                            </div>
                          </Col>
                          <Col md={3}>
                            <div className="form-floating mb-3">
                              <Input type="text" name="nextAppointmentReason" value={values.nextAppointmentReason} onChange={handleChange} disabled={isView} placeholder="Reason" />
                              <Label>Follow-Up Reason</Label>
                            </div>
                          </Col>
                          <Col md={3}>
                            <div className="mb-3">
                              <Label>Urgency</Label>
                              <Input type="select" name="nextAppointmentUrgency" value={values.nextAppointmentUrgency} onChange={handleChange} disabled={isView}>
                                <option value="routine">Routine</option>
                                <option value="soon">Soon</option>
                                <option value="urgent">Urgent</option>
                              </Input>
                            </div>
                          </Col>
                        </Row>
                        <Row>
                          <Col md={12}>
                            <div className="form-floating mb-3">
                              <Input type="textarea" name="nextAppointmentNotes" value={values.nextAppointmentNotes} onChange={handleChange} disabled={isView} style={{ height: "80px" }} placeholder="Notes" />
                              <Label>Follow-Up Notes</Label>
                            </div>
                          </Col>
                        </Row>
                      </TabPane>

                      {/* TREATMENT PLAN TAB */}
                      <TabPane tabId="treatmentplan">
                        {!values.patientId ? (
                          <p className="text-muted">Select a patient first to view or create treatment plans.</p>
                        ) : plansLoading ? (
                          <div className="text-center py-3"><span className="spinner-border spinner-border-sm"></span></div>
                        ) : (
                          <>
                            {patientPlans.length > 0 && (
                              <div className="mb-4">
                                <h6>Existing Treatment Plans</h6>
                                {patientPlans.map((plan) => (
                                  <Card key={plan._id} className="border mb-2">
                                    <CardBody className="p-3">
                                      <div className="d-flex justify-content-between align-items-start">
                                        <div>
                                          <h6 className="mb-1">{plan.planName}</h6>
                                          <small className="text-muted">
                                            {plan.doctorId?.doctorName || "-"} | {plan.milestones?.length || 0} milestones | Est: ₹{plan.totalEstimatedCost || 0}
                                          </small>
                                          {plan.description && <p className="mb-0 mt-1 text-muted small">{plan.description}</p>}
                                        </div>
                                        <div className="d-flex gap-2 align-items-center">
                                          <Badge color={
                                            plan.status === "proposed" ? "warning" :
                                            plan.status === "accepted" ? "info" :
                                            plan.status === "in_progress" ? "primary" :
                                            plan.status === "completed" ? "success" : "danger"
                                          } className="text-capitalize">
                                            {plan.status?.replace(/_/g, " ")}
                                          </Badge>
                                          {plan.status === "proposed" && !isView && (
                                            <Button color="primary" size="sm" onClick={() => handleAcceptPlan(plan._id)}>
                                              Accept
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                      {plan.milestones && plan.milestones.length > 0 && (
                                        <Table size="sm" bordered className="mt-2 mb-0" style={{ fontSize: "12px" }}>
                                          <thead>
                                            <tr><th>Procedure</th><th>Est. Cost</th><th>Date</th><th>Status</th></tr>
                                          </thead>
                                          <tbody>
                                            {plan.milestones.map((m, i) => (
                                              <tr key={i}>
                                                <td>{m.procedureId?.label || m.procedureName || "-"}</td>
                                                <td>₹{m.estimatedCost || 0}</td>
                                                <td>{m.suggestedDate ? new Date(m.suggestedDate).toLocaleDateString("en-IN") : "-"}</td>
                                                <td>
                                                  <Badge color={m.status === "completed" ? "success" : m.status === "scheduled" ? "info" : "warning"} className="text-capitalize" style={{ fontSize: "10px" }}>
                                                    {m.status}
                                                  </Badge>
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </Table>
                                      )}
                                    </CardBody>
                                  </Card>
                                ))}
                              </div>
                            )}

                            {!isView && (
                              <>
                                {!showPlanForm ? (
                                  <Button color="soft-primary" size="sm" onClick={() => setShowPlanForm(true)}>
                                    <i className="ri-add-line me-1"></i>Create New Treatment Plan
                                  </Button>
                                ) : (
                                  <Card className="border">
                                    <CardBody>
                                      <h6>New Treatment Plan</h6>
                                      <Row>
                                        <Col md={6}>
                                          <div className="form-floating mb-3">
                                            <Input type="text" value={newPlan.planName} onChange={(e) => setNewPlan({ ...newPlan, planName: e.target.value })} placeholder="Plan Name" />
                                            <Label>Plan Name <span className="text-danger">*</span></Label>
                                          </div>
                                        </Col>
                                        <Col md={6}>
                                          <div className="form-floating mb-3">
                                            <Input type="text" value={newPlan.description} onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })} placeholder="Description" />
                                            <Label>Description</Label>
                                          </div>
                                        </Col>
                                      </Row>

                                      <div className="d-flex justify-content-between align-items-center mb-2">
                                        <Label className="mb-0 fw-semibold">Milestones</Label>
                                        <Button color="soft-primary" size="sm" onClick={addPlanMilestone}>+ Add</Button>
                                      </div>

                                      {newPlan.milestones.map((m, idx) => (
                                        <Row key={idx} className="mb-2 align-items-end">
                                          <Col md={3}>
                                            <Input type="text" placeholder="Procedure name" value={m.procedureName || ""} onChange={(e) => updatePlanMilestone(idx, "procedureName", e.target.value)} />
                                          </Col>
                                          <Col md={2}>
                                            <Input type="number" min="0" placeholder="Est. Cost" value={m.estimatedCost} onChange={(e) => updatePlanMilestone(idx, "estimatedCost", e.target.value)} />
                                          </Col>
                                          <Col md={2}>
                                            <Input type="date" value={m.suggestedDate || ""} onChange={(e) => updatePlanMilestone(idx, "suggestedDate", e.target.value)} />
                                          </Col>
                                          <Col md={3}>
                                            <Input type="text" placeholder="Notes" value={m.notes || ""} onChange={(e) => updatePlanMilestone(idx, "notes", e.target.value)} />
                                          </Col>
                                          <Col md={2}>
                                            <Button color="danger" size="sm" onClick={() => removePlanMilestone(idx)}>Remove</Button>
                                          </Col>
                                        </Row>
                                      ))}

                                      <div className="hstack gap-2 mt-3">
                                        <Button color="success" size="sm" onClick={handleCreatePlan} disabled={planSubmitting}>
                                          {planSubmitting ? "Creating..." : "Create Plan"}
                                        </Button>
                                        <Button color="outline-secondary" size="sm" onClick={() => { setShowPlanForm(false); setNewPlan({ planName: "", description: "", milestones: [] }); }}>
                                          Cancel
                                        </Button>
                                      </div>
                                    </CardBody>
                                  </Card>
                                )}
                              </>
                            )}

                            {patientPlans.length === 0 && !showPlanForm && isView && (
                              <p className="text-muted">No treatment plans for this patient.</p>
                            )}
                          </>
                        )}
                      </TabPane>

                      {/* BILLING TAB */}
                      <TabPane tabId="billing">
                        <Row>
                          <Col md={4}>
                            <div className="mb-3">
                              <Label>Discount Type</Label>
                              <Input type="select" name="discountType" value={values.discountType} onChange={handleChange} disabled={isView}>
                                <option value="">None</option>
                                <option value="percentage">Percentage</option>
                                <option value="fixed">Fixed Amount</option>
                              </Input>
                            </div>
                          </Col>
                          <Col md={4}>
                            <div className="form-floating mb-3">
                              <Input type="number" min="0" name="discountValue" value={values.discountValue} onChange={handleChange} disabled={isView || !values.discountType} placeholder="Value" />
                              <Label>Discount Value</Label>
                            </div>
                          </Col>
                        </Row>
                        <Row>
                          <Col md={12}>
                            <Table bordered className="mt-2">
                              <tbody>
                                <tr><td><strong>Total Cost (Procedures)</strong></td><td className="text-end">₹{totalCost.toFixed(2)}</td></tr>
                                <tr><td>Discount</td><td className="text-end">- ₹{discountAmount.toFixed(2)}</td></tr>
                                <tr className="table-success"><td><strong>Net Amount</strong></td><td className="text-end"><strong>₹{netAmount.toFixed(2)}</strong></td></tr>
                              </tbody>
                            </Table>
                          </Col>
                        </Row>
                      </TabPane>
                    </TabContent>

                    {!isView ? (
                      <div className="hstack gap-2 mt-4">
                        <Button color="success" onClick={handleSubmit} disabled={isLoading}>
                          {isLoading ? <><span className="spinner-border spinner-border-sm me-1"></span>{isEdit ? "Updating..." : "Submitting..."}</> : isEdit ? "Update" : "Submit"}
                        </Button>
                        <Button color="outline-danger" onClick={() => navigate("/appointments")} disabled={isLoading}>Cancel</Button>
                      </div>
                    ) : (
                      <div className="hstack gap-2 mt-4">
                        <Button color="secondary" onClick={() => navigate("/appointments")}>Back to List</Button>
                      </div>
                    )}
                  </Form>
                )}
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default AppointmentForm;
