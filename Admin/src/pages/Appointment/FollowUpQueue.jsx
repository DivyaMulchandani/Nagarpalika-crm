import React, { useState, useEffect, useContext } from "react";
import {
  Container, Row, Col, Card, CardBody, CardHeader,
  Badge, Button, Spinner, Input, Modal, ModalHeader, ModalBody, ModalFooter,
  Label,
} from "reactstrap";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { getFollowUpQueue, updateAppointment, createAppointment, getDoctorSlots } from "../../api/appointments.api";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import Select from "react-select";
import { toast } from "react-toastify";

const urgencyColors = {
  routine: "info",
  soon: "warning",
  urgent: "danger",
};

const FollowUpQueue = () => {
  const { adminData } = useContext(AuthContext);
  const navigate = useNavigate();

  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, urgent, soon, routine
  const [scheduleModal, setScheduleModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [scheduling, setScheduling] = useState(false);

  // Schedule form state
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduleEndTime, setScheduleEndTime] = useState("");
  const [bookedSlots, setBookedSlots] = useState([]);

  useEffect(() => {
    fetchQueue();
  }, []);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await getFollowUpQueue();
      if (res.data.isOk) {
        setQueue(res.data.data || []);
      }
    } catch {
      toast.error("Failed to load follow-up queue");
    }
    setLoading(false);
  };

  const filtered = filter === "all"
    ? queue
    : queue.filter((a) => a.nextAppointmentUrgency === filter);

  const getPatientName = (a) => {
    const p = a.patientId;
    if (!p) return "-";
    return `${p.firstName || ""} ${p.lastName || ""}`.trim() || p.patientId || "-";
  };

  const formatDate = (d) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  const isOverdue = (d) => {
    if (!d) return false;
    return new Date(d) < new Date(new Date().toDateString());
  };

  // Open schedule modal
  const openScheduleModal = (item) => {
    setSelectedItem(item);
    setScheduleDate(item.nextAppointmentDate ? new Date(item.nextAppointmentDate).toISOString().split("T")[0] : "");
    setScheduleTime("");
    setScheduleEndTime("");
    setBookedSlots([]);
    setScheduleModal(true);

    // Auto-fetch slots if date is set
    if (item.nextAppointmentDate) {
      fetchSlots(item.doctorId?._id, new Date(item.nextAppointmentDate).toISOString().split("T")[0]);
    }
  };

  const fetchSlots = async (doctorId, date) => {
    if (!doctorId || !date) return;
    try {
      const res = await getDoctorSlots({ doctorId, date });
      if (res.data.isOk) {
        setBookedSlots(res.data.data || []);
      }
    } catch { /* ignore */ }
  };

  const handleDateChange = (e) => {
    setScheduleDate(e.target.value);
    if (selectedItem?.doctorId?._id) {
      fetchSlots(selectedItem.doctorId._id, e.target.value);
    }
  };

  // Generate time slots for the schedule picker
  const generateTimeSlots = () => {
    const slots = [];
    for (let h = 8; h < 20; h++) {
      for (let m = 0; m < 60; m += 30) {
        const time = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        const isBooked = bookedSlots.some((s) => s.startTime === time);
        slots.push({ time, isBooked });
      }
    }
    return slots;
  };

  // Schedule the follow-up as a new appointment
  const handleSchedule = async () => {
    if (!scheduleDate || !scheduleTime) {
      toast.error("Please select a date and time");
      return;
    }

    setScheduling(true);
    try {
      // Create the new appointment
      const newAppt = {
        appointmentDate: scheduleDate,
        startTime: scheduleTime,
        endTime: scheduleEndTime || undefined,
        patientId: selectedItem.patientId?._id || selectedItem.patientId,
        doctorId: selectedItem.doctorId?._id || selectedItem.doctorId,
        parentAppointmentId: selectedItem._id,
        status: "scheduled",
      };

      const res = await createAppointment(newAppt);
      if (res.data.isOk) {
        // Update the original appointment's followUpStatus
        await updateAppointment(selectedItem._id, { followUpStatus: "confirmed" });
        toast.success("Follow-up appointment scheduled");
        setScheduleModal(false);
        fetchQueue();
      } else {
        toast.error(res.data.message || "Failed to schedule");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to schedule follow-up");
    }
    setScheduling(false);
  };

  // Mark as cancelled
  const handleCancel = async (item) => {
    try {
      await updateAppointment(item._id, { followUpStatus: "cancelled" });
      toast.success("Follow-up cancelled");
      fetchQueue();
    } catch {
      toast.error("Failed to cancel follow-up");
    }
  };

  document.title = `Follow-Up Queue | ${adminData?.companyName || "HMS"}`;

  const urgentCount = queue.filter((a) => a.nextAppointmentUrgency === "urgent").length;
  const overdueCount = queue.filter((a) => isOverdue(a.nextAppointmentDate)).length;

  return (
    <div className="page-content">
      <Container fluid>
        <BreadCrumb maintitle="Appointments" title="Follow-Up Queue" pageTitle="Follow-Ups" />

        {/* Stats */}
        <Row className="mb-3 g-3">
          {[
            { label: "Total Pending", value: queue.length, color: "primary", icon: "ri-calendar-check-line" },
            { label: "Urgent", value: urgentCount, color: "danger", icon: "ri-alarm-warning-line" },
            { label: "Overdue", value: overdueCount, color: "warning", icon: "ri-error-warning-line" },
          ].map((w, i) => (
            <Col xs={6} md={4} key={i}>
              <Card className="mb-0 card-animate">
                <CardBody className="py-3">
                  <div className="d-flex align-items-center gap-3">
                    <div className={`avatar-sm rounded-circle bg-${w.color}-subtle d-flex align-items-center justify-content-center`}>
                      <i className={`${w.icon} text-${w.color}`} style={{ fontSize: "20px" }}></i>
                    </div>
                    <div>
                      <p className="text-muted mb-0" style={{ fontSize: "11px" }}>{w.label}</p>
                      <h4 className="mb-0">{w.value}</h4>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </Col>
          ))}
        </Row>

        {/* Filter */}
        <Row className="mb-3">
          <Col xs="auto">
            <div className="d-flex gap-2">
              {["all", "urgent", "soon", "routine"].map((f) => (
                <Button
                  key={f}
                  color={filter === f ? "primary" : "soft-primary"}
                  size="sm"
                  onClick={() => setFilter(f)}
                >
                  {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                </Button>
              ))}
            </div>
          </Col>
          <Col xs="auto" className="ms-auto">
            <Button color="soft-primary" size="sm" onClick={fetchQueue}>
              <i className="ri-refresh-line me-1"></i>Refresh
            </Button>
          </Col>
        </Row>

        {loading ? (
          <div className="text-center py-5"><Spinner color="primary" /></div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardBody className="text-center py-5 text-muted">
              <i className="ri-calendar-check-line" style={{ fontSize: "48px", opacity: 0.3 }}></i>
              <p className="mt-3 mb-0">No pending follow-ups</p>
            </CardBody>
          </Card>
        ) : (
          <Card>
            <CardBody className="p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Patient</th>
                      <th>Doctor</th>
                      <th>Suggested Date</th>
                      <th>Urgency</th>
                      <th>Reason</th>
                      <th>Notes</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item) => (
                      <tr key={item._id} className={isOverdue(item.nextAppointmentDate) ? "table-warning" : ""}>
                        <td>
                          <div className="fw-semibold">{getPatientName(item)}</div>
                          <small className="text-muted">{item.patientId?.mobileNumber || "-"}</small>
                        </td>
                        <td>
                          <div>Dr. {item.doctorId?.doctorName || "-"}</div>
                          <small className="text-muted">{item.doctorId?.doctorCode || ""}</small>
                        </td>
                        <td>
                          <div className={isOverdue(item.nextAppointmentDate) ? "text-danger fw-semibold" : ""}>
                            {formatDate(item.nextAppointmentDate)}
                          </div>
                          {isOverdue(item.nextAppointmentDate) && (
                            <Badge color="danger" style={{ fontSize: "10px" }}>OVERDUE</Badge>
                          )}
                        </td>
                        <td>
                          <Badge color={urgencyColors[item.nextAppointmentUrgency] || "info"} className="text-capitalize">
                            {item.nextAppointmentUrgency || "routine"}
                          </Badge>
                        </td>
                        <td style={{ maxWidth: "200px" }}>
                          <span className="text-truncate d-block" style={{ maxWidth: "200px" }}>
                            {item.nextAppointmentReason || "-"}
                          </span>
                        </td>
                        <td style={{ maxWidth: "200px" }}>
                          <span className="text-truncate d-block text-muted" style={{ maxWidth: "200px", fontSize: "12px" }}>
                            {item.nextAppointmentNotes || "-"}
                          </span>
                        </td>
                        <td className="text-end">
                          <div className="d-flex gap-1 justify-content-end">
                            <Button color="primary" size="sm" onClick={() => openScheduleModal(item)}>
                              <i className="ri-calendar-line me-1"></i>Schedule
                            </Button>
                            <Button color="soft-danger" size="sm" onClick={() => handleCancel(item)}>
                              <i className="ri-close-line"></i>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Schedule Modal */}
        <Modal isOpen={scheduleModal} toggle={() => setScheduleModal(false)} size="lg" centered>
          <ModalHeader toggle={() => setScheduleModal(false)}>
            Schedule Follow-Up — {selectedItem ? getPatientName(selectedItem) : ""}
          </ModalHeader>
          <ModalBody>
            {selectedItem && (
              <>
                <div className="alert alert-light mb-3">
                  <Row>
                    <Col md={6}>
                      <small className="text-muted">Doctor</small>
                      <div className="fw-semibold">Dr. {selectedItem.doctorId?.doctorName || "-"}</div>
                    </Col>
                    <Col md={3}>
                      <small className="text-muted">Urgency</small>
                      <div>
                        <Badge color={urgencyColors[selectedItem.nextAppointmentUrgency] || "info"} className="text-capitalize">
                          {selectedItem.nextAppointmentUrgency || "routine"}
                        </Badge>
                      </div>
                    </Col>
                    <Col md={3}>
                      <small className="text-muted">Reason</small>
                      <div style={{ fontSize: "13px" }}>{selectedItem.nextAppointmentReason || "-"}</div>
                    </Col>
                  </Row>
                  {selectedItem.nextAppointmentNotes && (
                    <div className="mt-2">
                      <small className="text-muted">Doctor Notes:</small>
                      <div style={{ fontSize: "13px" }}>{selectedItem.nextAppointmentNotes}</div>
                    </div>
                  )}
                </div>

                <Row>
                  <Col md={4}>
                    <div className="mb-3">
                      <Label className="form-label">Date</Label>
                      <Input type="date" value={scheduleDate} onChange={handleDateChange} />
                    </div>
                  </Col>
                  <Col md={4}>
                    <div className="mb-3">
                      <Label className="form-label">Start Time</Label>
                      <Input type="select" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)}>
                        <option value="">Select time...</option>
                        {generateTimeSlots().map((s) => (
                          <option key={s.time} value={s.time} disabled={s.isBooked}>
                            {s.time}{s.isBooked ? " (Booked)" : ""}
                          </option>
                        ))}
                      </Input>
                    </div>
                  </Col>
                  <Col md={4}>
                    <div className="mb-3">
                      <Label className="form-label">End Time (optional)</Label>
                      <Input type="time" value={scheduleEndTime} onChange={(e) => setScheduleEndTime(e.target.value)} />
                    </div>
                  </Col>
                </Row>

                {bookedSlots.length > 0 && scheduleDate && (
                  <div className="text-muted" style={{ fontSize: "12px" }}>
                    <i className="ri-information-line me-1"></i>
                    {bookedSlots.length} existing appointment(s) on this date for this doctor.
                  </div>
                )}
              </>
            )}
          </ModalBody>
          <ModalFooter>
            <Button color="light" onClick={() => setScheduleModal(false)}>Cancel</Button>
            <Button color="primary" onClick={handleSchedule} disabled={scheduling}>
              {scheduling ? "Scheduling..." : "Schedule Appointment"}
            </Button>
          </ModalFooter>
        </Modal>
      </Container>
    </div>
  );
};

export default FollowUpQueue;
