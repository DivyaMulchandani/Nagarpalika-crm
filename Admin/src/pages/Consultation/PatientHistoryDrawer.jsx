import React, { useState, useEffect } from "react";
import {
  Offcanvas, OffcanvasHeader, OffcanvasBody,
  Badge, Spinner, Card, CardBody, Collapse,
} from "reactstrap";
import { getPatientAppointments } from "../../api/appointments.api";
import { getPrescriptionsByPatient } from "../../api/prescriptions.api";

const statusColors = {
  scheduled: "primary",
  confirmed: "info",
  arrived: "warning",
  in_consultation: "secondary",
  completed: "success",
  checked_out: "dark",
  follow_up_planned: "info",
  cancelled: "danger",
  no_show: "danger",
  rescheduled: "warning",
};

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-";

const PatientHistoryDrawer = ({
  isOpen,
  toggle,
  patientId,
  patientName,
  patientAge,
  patientGender,
  patientBloodGroup,
  patientAllergies,
  currentDoctorId,
}) => {
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    if (!isOpen || !patientId) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [apptRes, rxRes] = await Promise.all([
          getPatientAppointments(patientId),
          getPrescriptionsByPatient(patientId),
        ]);
        if (apptRes.data.isOk) setAppointments(apptRes.data.data || []);
        if (rxRes.data.isOk) setPrescriptions(rxRes.data.data || []);
      } catch (err) {
        console.error("Failed to fetch patient history:", err);
      }
      setLoading(false);
    };
    fetchData();
  }, [isOpen, patientId]);

  // Group prescriptions by appointmentId for quick lookup
  const rxByAppointment = {};
  prescriptions.forEach((rx) => {
    const apptId = rx.appointmentId?._id || rx.appointmentId;
    if (!rxByAppointment[apptId]) rxByAppointment[apptId] = [];
    rxByAppointment[apptId].push(rx);
  });

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <Offcanvas
      isOpen={isOpen}
      toggle={toggle}
      direction="end"
      scrollable
      style={{ width: "520px" }}
    >
      <OffcanvasHeader toggle={toggle}>
        <i className="ri-history-line me-2 text-primary"></i>Patient History
      </OffcanvasHeader>
      <OffcanvasBody>
        {/* Patient Summary */}
        <div className="p-3 bg-light rounded mb-3">
          <h6 className="mb-1">{patientName || "Patient"}</h6>
          <div className="text-muted" style={{ fontSize: "13px" }}>
            {[patientAge, patientGender, patientBloodGroup].filter(Boolean).join(" · ")}
          </div>
          {patientAllergies && (
            <div className="mt-1">
              <Badge color="soft-danger" style={{ fontSize: "11px" }}>
                Allergies: {patientAllergies}
              </Badge>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-4">
            <Spinner size="sm" color="primary" /> Loading history...
          </div>
        ) : appointments.length === 0 ? (
          <p className="text-muted text-center">No appointment history found.</p>
        ) : (
          <div className="timeline-history">
            {appointments.map((a, index) => {
              const doctorId = a.doctorId?._id || a.doctorId;
              const isCurrentDoctor = currentDoctorId && String(doctorId) === String(currentDoctorId);
              const apptRx = rxByAppointment[a._id] || [];

              return (
                <div key={a._id} className="d-flex mb-3" style={{ position: "relative" }}>
                  {/* Timeline line */}
                  <div
                    className="d-flex flex-column align-items-center me-3"
                    style={{ width: "20px", minWidth: "20px" }}
                  >
                    <div
                      style={{
                        width: "12px",
                        height: "12px",
                        borderRadius: "50%",
                        backgroundColor: isCurrentDoctor ? "#0ab39c" : "#878a99",
                        border: isCurrentDoctor ? "2px solid #099885" : "2px solid #6c757d",
                        flexShrink: 0,
                        marginTop: "4px",
                      }}
                    />
                    {index < appointments.length - 1 && (
                      <div style={{ width: "2px", flex: 1, backgroundColor: "#dee2e6", minHeight: "20px" }} />
                    )}
                  </div>

                  {/* Appointment Card */}
                  <Card
                    className="flex-grow-1 mb-0 shadow-sm"
                    style={{
                      cursor: "pointer",
                      borderLeft: isCurrentDoctor ? "3px solid #0ab39c" : "3px solid #e9ecef",
                    }}
                    onClick={() => toggleExpand(a._id)}
                  >
                    <CardBody className="py-2 px-3">
                      {/* Header */}
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <div className="fw-semibold" style={{ fontSize: "13px" }}>
                            {formatDate(a.appointmentDate)}
                            <span className="text-muted fw-normal ms-2" style={{ fontSize: "12px" }}>
                              {a.startTime || ""}{a.endTime ? ` - ${a.endTime}` : ""}
                            </span>
                          </div>
                          <div className="text-muted" style={{ fontSize: "12px" }}>
                            Dr. {a.doctorId?.doctorName || "-"}
                            {isCurrentDoctor && (
                              <Badge color="soft-success" className="ms-1" style={{ fontSize: "9px" }}>You</Badge>
                            )}
                          </div>
                        </div>
                        <div className="d-flex align-items-center gap-1">
                          <Badge color={statusColors[a.status] || "secondary"} className="text-capitalize" style={{ fontSize: "10px" }}>
                            {a.status?.replace(/_/g, " ")}
                          </Badge>
                          <i className={`ri-arrow-${expandedId === a._id ? "up" : "down"}-s-line text-muted`}></i>
                        </div>
                      </div>

                      {/* Expandable Content */}
                      <Collapse isOpen={expandedId === a._id}>
                        <div className="mt-2 pt-2 border-top" style={{ fontSize: "12px" }}>
                          {/* Chief Complaints */}
                          {a.chiefComplaints?.length > 0 && (
                            <div className="mb-2">
                              <strong className="text-muted">Chief Complaints:</strong>
                              <div>
                                {a.chiefComplaints.map((c, ci) => (
                                  <Badge key={ci} color="soft-primary" className="me-1 mb-1">
                                    {c.label || c}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Diagnosis */}
                          {a.diagnosis?.length > 0 && (
                            <div className="mb-2">
                              <strong className="text-muted">Diagnosis:</strong>
                              <ul className="mb-0 ps-3">
                                {a.diagnosis.map((d, di) => (
                                  <li key={di}>
                                    {d.diagnosisId?.label || "-"}
                                    {d.notes ? ` — ${d.notes}` : ""}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Procedures */}
                          {a.procedures?.length > 0 && (
                            <div className="mb-2">
                              <strong className="text-muted">Procedures:</strong>
                              <ul className="mb-0 ps-3">
                                {a.procedures.map((p, pi) => (
                                  <li key={pi}>
                                    {p.procedureId?.label || "-"}
                                    {p.toothNumber ? ` (Tooth #${p.toothNumber})` : ""}
                                    {p.cost ? ` — ₹${p.cost}` : ""}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Prescriptions */}
                          {apptRx.length > 0 && apptRx.map((rx) => (
                            <div key={rx._id} className="mb-2">
                              <strong className="text-muted">Prescriptions:</strong>
                              <ul className="mb-0 ps-3">
                                {rx.medicines?.map((m, mi) => (
                                  <li key={mi}>
                                    <strong>{m.medicineName}</strong>
                                    {m.dosage ? ` ${m.dosage}` : ""}
                                    {m.dosageUnitId?.label ? ` ${m.dosageUnitId.label}` : ""}
                                    {m.frequencyId?.label ? ` — ${m.frequencyId.label}` : ""}
                                    {m.duration ? ` for ${m.duration}` : ""}
                                    {m.durationUnitId?.label ? ` ${m.durationUnitId.label}` : ""}
                                  </li>
                                ))}
                              </ul>
                              {rx.notes && (
                                <div className="text-muted fst-italic mt-1">Note: {rx.notes}</div>
                              )}
                            </div>
                          ))}

                          {/* Legacy embedded prescriptions (fallback) */}
                          {apptRx.length === 0 && a.prescriptions?.length > 0 && (
                            <div className="mb-2">
                              <strong className="text-muted">Prescriptions:</strong>
                              <ul className="mb-0 ps-3">
                                {a.prescriptions.map((p, pi) => (
                                  <li key={pi}>
                                    <strong>{p.medicineName}</strong>
                                    {p.dosage ? ` ${p.dosage}` : ""}
                                    {p.frequencyId?.label ? ` — ${p.frequencyId.label}` : ""}
                                    {p.duration ? ` for ${p.duration}` : ""}
                                    {p.durationUnitId?.label ? ` ${p.durationUnitId.label}` : ""}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Clinical Notes */}
                          {a.clinicalNotes?.length > 0 && (
                            <div className="mb-2">
                              <strong className="text-muted">Clinical Notes:</strong>
                              {a.clinicalNotes.map((n, ni) => (
                                <div key={ni} className="ms-2">
                                  {n.noteTypeId?.label && <Badge color="soft-secondary" className="me-1">{n.noteTypeId.label}</Badge>}
                                  {n.content}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Follow-Up */}
                          {a.nextAppointmentDate && (
                            <div className="mb-2">
                              <strong className="text-muted">Follow-Up:</strong> {formatDate(a.nextAppointmentDate)}
                              {a.nextAppointmentReason ? ` — ${a.nextAppointmentReason}` : ""}
                            </div>
                          )}

                          {/* No clinical data */}
                          {!a.diagnosis?.length && !a.procedures?.length && !a.clinicalNotes?.length && apptRx.length === 0 && !a.prescriptions?.length && (
                            <p className="text-muted mb-0 fst-italic">No clinical data recorded.</p>
                          )}
                        </div>
                      </Collapse>
                    </CardBody>
                  </Card>
                </div>
              );
            })}
          </div>
        )}

        <div className="text-muted text-center mt-2" style={{ fontSize: "12px" }}>
          {appointments.length > 0 && `${appointments.length} appointment${appointments.length !== 1 ? "s" : ""} total`}
        </div>
      </OffcanvasBody>
    </Offcanvas>
  );
};

export default PatientHistoryDrawer;
