import React, { useState, useEffect, useContext } from "react";
import {
  Container, Row, Col, Card, CardBody, CardHeader,
  Badge, Button, Spinner, Progress,
} from "reactstrap";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { getDoctorDashboardStats } from "../../api/analytics.api";

const statusConfig = {
  scheduled: { color: "primary", icon: "ri-calendar-line", label: "Scheduled" },
  confirmed: { color: "info", icon: "ri-check-line", label: "Confirmed" },
  arrived: { color: "warning", icon: "ri-walk-line", label: "Arrived" },
  in_consultation: { color: "secondary", icon: "ri-stethoscope-line", label: "In Consultation" },
  completed: { color: "success", icon: "ri-check-double-line", label: "Completed" },
  checked_out: { color: "dark", icon: "ri-logout-box-line", label: "Checked Out" },
  follow_up_planned: { color: "info", icon: "ri-repeat-line", label: "Follow-Up Planned" },
  no_show: { color: "danger", icon: "ri-user-unfollow-line", label: "No Show" },
};

const formatTime = (timeStr) => {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${m} ${ampm}`;
};

const formatDate = (d) => {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
};

const DoctorDashboard = () => {
  const { adminData } = useContext(AuthContext);
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? "Good Morning" : currentHour < 17 ? "Good Afternoon" : "Good Evening";

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await getDoctorDashboardStats();
      if (res.data.isOk) {
        setStats(res.data.data);
      }
    } catch {
      // fail silently
    }
    setLoading(false);
  };

  document.title = `Dashboard | Dr. ${adminData?.doctorName || ""}`;

  const today = stats?.today || { total: 0, completed: 0, remaining: 0, inConsultation: 0, byStatus: {}, appointments: [] };
  const progressPercent = today.total > 0 ? Math.round((today.completed / today.total) * 100) : 0;

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          {/* ─── Greeting ─── */}
          <Row className="mb-3 align-items-center">
            <Col>
              <h4 className="mb-0">
                {greeting}, <span className="text-primary">Dr. {adminData?.doctorName}</span>
              </h4>
              <p className="text-muted mb-0">
                {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
              </p>
            </Col>
            <Col xs="auto">
              <Button color="soft-primary" size="sm" onClick={fetchStats} disabled={loading}>
                <i className="ri-refresh-line me-1"></i>Refresh
              </Button>
            </Col>
          </Row>

          {loading ? (
            <div className="text-center py-5"><Spinner color="primary" /></div>
          ) : (
            <>
              {/* ─── Stat Widgets ─── */}
              <Row>
                <Col md={6} xl={3}>
                  <Card className="card-animate">
                    <CardBody>
                      <div className="d-flex align-items-center">
                        <div className="flex-grow-1">
                          <p className="text-uppercase fw-medium text-muted mb-0" style={{ fontSize: "12px" }}>
                            Today&apos;s Patients
                          </p>
                          <h4 className="fs-22 fw-semibold mb-0 mt-2">{today.total}</h4>
                          <div className="d-flex align-items-center gap-2 mt-1">
                            <span className="text-success" style={{ fontSize: "12px" }}>
                              <i className="ri-check-line me-1"></i>{today.completed} done
                            </span>
                            <span className="text-muted" style={{ fontSize: "12px" }}>
                              {today.remaining} remaining
                            </span>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <div className="avatar-sm rounded-circle bg-primary-subtle d-flex align-items-center justify-content-center">
                            <i className="ri-calendar-check-line text-primary" style={{ fontSize: "22px" }}></i>
                          </div>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                </Col>

                <Col md={6} xl={3}>
                  <Card className="card-animate" style={{ cursor: "pointer" }} onClick={() => navigate("/appointments")}>
                    <CardBody>
                      <div className="d-flex align-items-center">
                        <div className="flex-grow-1">
                          <p className="text-uppercase fw-medium text-muted mb-0" style={{ fontSize: "12px" }}>
                            This Week
                          </p>
                          <h4 className="fs-22 fw-semibold mb-0 mt-2">{stats?.thisWeek || 0}</h4>
                          <p className="text-muted mb-0 mt-1" style={{ fontSize: "12px" }}>appointments</p>
                        </div>
                        <div className="flex-shrink-0">
                          <div className="avatar-sm rounded-circle bg-info-subtle d-flex align-items-center justify-content-center">
                            <i className="ri-calendar-2-line text-info" style={{ fontSize: "22px" }}></i>
                          </div>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                </Col>

                <Col md={6} xl={3}>
                  <Card className="card-animate">
                    <CardBody>
                      <div className="d-flex align-items-center">
                        <div className="flex-grow-1">
                          <p className="text-uppercase fw-medium text-muted mb-0" style={{ fontSize: "12px" }}>
                            Consultations This Month
                          </p>
                          <h4 className="fs-22 fw-semibold mb-0 mt-2">{stats?.completedThisMonth || 0}</h4>
                          <p className="text-muted mb-0 mt-1" style={{ fontSize: "12px" }}>
                            of {stats?.thisMonth || 0} total
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          <div className="avatar-sm rounded-circle bg-success-subtle d-flex align-items-center justify-content-center">
                            <i className="ri-stethoscope-line text-success" style={{ fontSize: "22px" }}></i>
                          </div>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                </Col>

                <Col md={6} xl={3}>
                  <Card className="card-animate">
                    <CardBody>
                      <div className="d-flex align-items-center">
                        <div className="flex-grow-1">
                          <p className="text-uppercase fw-medium text-muted mb-0" style={{ fontSize: "12px" }}>
                            Patients (30 Days)
                          </p>
                          <h4 className="fs-22 fw-semibold mb-0 mt-2">{stats?.uniquePatientsLast30Days || 0}</h4>
                          <p className="text-muted mb-0 mt-1" style={{ fontSize: "12px" }}>unique patients</p>
                        </div>
                        <div className="flex-shrink-0">
                          <div className="avatar-sm rounded-circle bg-warning-subtle d-flex align-items-center justify-content-center">
                            <i className="ri-user-heart-line text-warning" style={{ fontSize: "22px" }}></i>
                          </div>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                </Col>
              </Row>

              {/* ─── Current / Next Appointment + Progress ─── */}
              <Row>
                {/* Active consultation or next up */}
                <Col xl={4}>
                  {stats?.currentAppointment ? (
                    <Card className="border-secondary border">
                      <CardHeader className="bg-secondary-subtle">
                        <div className="d-flex align-items-center">
                          <i className="ri-stethoscope-line text-secondary me-2 fs-18"></i>
                          <h6 className="card-title mb-0 text-secondary">Currently Consulting</h6>
                        </div>
                      </CardHeader>
                      <CardBody>
                        <AppointmentQuickCard appt={stats.currentAppointment} navigate={navigate} highlight />
                      </CardBody>
                    </Card>
                  ) : stats?.nextAppointment ? (
                    <Card className="border-primary border">
                      <CardHeader className="bg-primary-subtle">
                        <div className="d-flex align-items-center">
                          <i className="ri-time-line text-primary me-2 fs-18"></i>
                          <h6 className="card-title mb-0 text-primary">Next Appointment</h6>
                        </div>
                      </CardHeader>
                      <CardBody>
                        <AppointmentQuickCard appt={stats.nextAppointment} navigate={navigate} />
                      </CardBody>
                    </Card>
                  ) : (
                    <Card>
                      <CardBody className="text-center py-4">
                        <div className="avatar-md rounded-circle bg-success-subtle d-flex align-items-center justify-content-center mx-auto mb-3">
                          <i className="ri-check-double-line text-success" style={{ fontSize: "28px" }}></i>
                        </div>
                        <h6>All Clear!</h6>
                        <p className="text-muted mb-0">No pending appointments right now.</p>
                      </CardBody>
                    </Card>
                  )}
                </Col>

                {/* Today's progress */}
                <Col xl={4}>
                  <Card className="h-100">
                    <CardHeader>
                      <h6 className="card-title mb-0">
                        <i className="ri-pie-chart-line me-2 text-primary"></i>Today&apos;s Progress
                      </h6>
                    </CardHeader>
                    <CardBody>
                      {today.total === 0 ? (
                        <div className="text-center text-muted py-3">
                          <i className="ri-calendar-line" style={{ fontSize: "36px", opacity: 0.3 }}></i>
                          <p className="mt-2 mb-0">No appointments today</p>
                        </div>
                      ) : (
                        <>
                          <div className="d-flex justify-content-between mb-2">
                            <span className="text-muted" style={{ fontSize: "13px" }}>
                              {today.completed} of {today.total} completed
                            </span>
                            <span className="fw-semibold">{progressPercent}%</span>
                          </div>
                          <Progress value={progressPercent} color="success" className="mb-3" style={{ height: "8px" }} />

                          <div className="d-flex flex-wrap gap-2">
                            {Object.entries(today.byStatus).map(([status, count]) => {
                              const cfg = statusConfig[status] || { color: "secondary", label: status };
                              return (
                                <div key={status} className="d-flex align-items-center gap-1">
                                  <Badge color={cfg.color} pill style={{ fontSize: "10px" }}>
                                    {count}
                                  </Badge>
                                  <span className="text-muted" style={{ fontSize: "11px" }}>
                                    {cfg.label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </CardBody>
                  </Card>
                </Col>

                {/* Quick Actions */}
                <Col xl={4}>
                  <Card className="h-100">
                    <CardHeader>
                      <h6 className="card-title mb-0">
                        <i className="ri-flashlight-line me-2 text-warning"></i>Quick Actions
                      </h6>
                    </CardHeader>
                    <CardBody className="d-flex flex-column gap-2">
                      <Button color="soft-primary" className="text-start" onClick={() => navigate("/appointments")}>
                        <i className="ri-calendar-check-line me-2"></i>View All Appointments
                      </Button>
                      <Button color="soft-success" className="text-start" onClick={() => navigate("/follow-up-queue")}>
                        <i className="ri-repeat-line me-2"></i>Follow-Up Queue
                        {stats?.followUpsPending?.length > 0 && (
                          <Badge color="danger" pill className="ms-2">{stats.followUpsPending.length}</Badge>
                        )}
                      </Button>
                      <Button color="soft-warning" className="text-start" onClick={() => navigate("/reports")}>
                        <i className="ri-bar-chart-box-line me-2"></i>Reports
                      </Button>
                    </CardBody>
                  </Card>
                </Col>
              </Row>

              {/* ─── Today's Schedule + Follow-Ups ─── */}
              <Row>
                {/* Schedule timeline */}
                <Col xl={8}>
                  <Card>
                    <CardHeader className="d-flex justify-content-between align-items-center">
                      <h6 className="card-title mb-0">
                        <i className="ri-time-line me-2 text-primary"></i>Today&apos;s Schedule
                      </h6>
                      <Badge color="soft-primary" style={{ fontSize: "12px" }}>
                        {today.total} appointment{today.total !== 1 ? "s" : ""}
                      </Badge>
                    </CardHeader>
                    <CardBody style={{ maxHeight: "420px", overflowY: "auto" }}>
                      {today.appointments.length === 0 ? (
                        <div className="text-center text-muted py-4">
                          <i className="ri-calendar-line" style={{ fontSize: "40px", opacity: 0.3 }}></i>
                          <p className="mt-2 mb-0">No appointments scheduled for today</p>
                        </div>
                      ) : (
                        <div className="timeline-schedule">
                          {today.appointments.map((appt, idx) => {
                            const cfg = statusConfig[appt.status] || { color: "secondary", label: appt.status };
                            const patient = appt.patientId;
                            const isActive = appt.status === "in_consultation";
                            const isPast = ["completed", "checked_out", "follow_up_planned"].includes(appt.status);

                            return (
                              <div
                                key={appt._id}
                                className={`d-flex align-items-start gap-3 py-2 px-2 rounded ${isActive ? "bg-secondary-subtle border border-secondary" : ""} ${idx < today.appointments.length - 1 ? "mb-2" : ""}`}
                                style={{
                                  opacity: isPast ? 0.6 : 1,
                                  cursor: "pointer",
                                }}
                                onClick={() => navigate(`/consultation/${appt._id}`)}
                              >
                                {/* Time */}
                                <div className="text-center flex-shrink-0" style={{ minWidth: "65px" }}>
                                  <span className={`fw-semibold ${isActive ? "text-secondary" : "text-dark"}`} style={{ fontSize: "14px" }}>
                                    {formatTime(appt.startTime)}
                                  </span>
                                  {appt.endTime && (
                                    <div className="text-muted" style={{ fontSize: "10px" }}>
                                      to {formatTime(appt.endTime)}
                                    </div>
                                  )}
                                </div>

                                {/* Status indicator */}
                                <div className="flex-shrink-0" style={{ paddingTop: "4px" }}>
                                  <div
                                    className={`rounded-circle bg-${cfg.color}`}
                                    style={{ width: "10px", height: "10px" }}
                                  ></div>
                                </div>

                                {/* Patient info */}
                                <div className="flex-grow-1 min-w-0">
                                  <div className="d-flex align-items-center gap-2">
                                    <h6 className="mb-0" style={{ fontSize: "13px" }}>
                                      {patient?.firstName} {patient?.lastName}
                                    </h6>
                                    <Badge color={`soft-${cfg.color}`} style={{ fontSize: "10px" }}>
                                      {cfg.label}
                                    </Badge>
                                    {appt.isEmergency && (
                                      <Badge color="danger" style={{ fontSize: "10px" }}>Urgent</Badge>
                                    )}
                                  </div>
                                  <div className="text-muted" style={{ fontSize: "11px" }}>
                                    {patient?.patientId && <span className="me-2">#{patient.patientId}</span>}
                                    {appt.appointmentTypeId?.label && (
                                      <span>{appt.appointmentTypeId.label}</span>
                                    )}
                                  </div>
                                </div>

                                {/* Action */}
                                <div className="flex-shrink-0">
                                  {isActive ? (
                                    <Button color="secondary" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/consultation/${appt._id}`); }}>
                                      <i className="ri-stethoscope-line me-1"></i>Continue
                                    </Button>
                                  ) : appt.status === "arrived" ? (
                                    <Button color="outline-secondary" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/consultation/${appt._id}`); }}>
                                      Start
                                    </Button>
                                  ) : isPast ? (
                                    <i className="ri-check-line text-success fs-18"></i>
                                  ) : null}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardBody>
                  </Card>
                </Col>

                {/* Follow-ups pending */}
                <Col xl={4}>
                  <Card>
                    <CardHeader className="d-flex justify-content-between align-items-center">
                      <h6 className="card-title mb-0">
                        <i className="ri-repeat-line me-2 text-warning"></i>Pending Follow-Ups
                      </h6>
                      {stats?.followUpsPending?.length > 0 && (
                        <Badge color="warning" pill>{stats.followUpsPending.length}</Badge>
                      )}
                    </CardHeader>
                    <CardBody style={{ maxHeight: "420px", overflowY: "auto" }}>
                      {!stats?.followUpsPending || stats.followUpsPending.length === 0 ? (
                        <div className="text-center text-muted py-4">
                          <i className="ri-check-double-line" style={{ fontSize: "36px", opacity: 0.3 }}></i>
                          <p className="mt-2 mb-0">No pending follow-ups</p>
                        </div>
                      ) : (
                        <div className="vstack gap-3">
                          {stats.followUpsPending.map((fu) => {
                            const patient = fu.patientId;
                            const isOverdue = fu.nextAppointmentDate && new Date(fu.nextAppointmentDate) < new Date();
                            return (
                              <div key={fu._id} className="d-flex align-items-start gap-2">
                                <div className={`avatar-xs rounded-circle bg-${isOverdue ? "danger" : "warning"}-subtle d-flex align-items-center justify-content-center flex-shrink-0`}>
                                  <span className={`text-${isOverdue ? "danger" : "warning"} fw-semibold`} style={{ fontSize: "11px" }}>
                                    {(patient?.firstName || "?")[0]}
                                  </span>
                                </div>
                                <div className="flex-grow-1 min-w-0">
                                  <h6 className="mb-0" style={{ fontSize: "13px" }}>
                                    {patient?.firstName} {patient?.lastName}
                                  </h6>
                                  <div className="text-muted" style={{ fontSize: "11px" }}>
                                    Due: {formatDate(fu.nextAppointmentDate)}
                                    {isOverdue && (
                                      <Badge color="soft-danger" className="ms-1" style={{ fontSize: "9px" }}>Overdue</Badge>
                                    )}
                                  </div>
                                  {fu.nextAppointmentReason && (
                                    <div className="text-muted text-truncate" style={{ fontSize: "11px" }}>
                                      {fu.nextAppointmentReason}
                                    </div>
                                  )}
                                </div>
                                <Button
                                  color="soft-primary"
                                  size="sm"
                                  className="flex-shrink-0"
                                  onClick={() => navigate("/appointments/add")}
                                  title="Schedule follow-up"
                                >
                                  <i className="ri-add-line"></i>
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardBody>
                  </Card>
                </Col>
              </Row>

              {/* ─── Upcoming Appointments ─── */}
              {stats?.upcomingAppointments?.length > 0 && (
                <Row>
                  <Col>
                    <Card>
                      <CardHeader>
                        <h6 className="card-title mb-0">
                          <i className="ri-calendar-todo-line me-2 text-info"></i>Upcoming Appointments
                        </h6>
                      </CardHeader>
                      <CardBody>
                        <div className="table-responsive">
                          <table className="table table-hover table-sm mb-0 align-middle">
                            <thead className="table-light">
                              <tr>
                                <th style={{ fontSize: "12px" }}>Date</th>
                                <th style={{ fontSize: "12px" }}>Time</th>
                                <th style={{ fontSize: "12px" }}>Patient</th>
                                <th style={{ fontSize: "12px" }}>Type</th>
                                <th style={{ fontSize: "12px" }}>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {stats.upcomingAppointments.map((appt) => {
                                const cfg = statusConfig[appt.status] || { color: "secondary", label: appt.status };
                                return (
                                  <tr
                                    key={appt._id}
                                    style={{ cursor: "pointer" }}
                                    onClick={() => navigate(`/consultation/${appt._id}`)}
                                  >
                                    <td style={{ fontSize: "13px" }}>{formatDate(appt.appointmentDate)}</td>
                                    <td style={{ fontSize: "13px" }}>{formatTime(appt.startTime)}</td>
                                    <td style={{ fontSize: "13px" }}>
                                      {appt.patientId?.firstName} {appt.patientId?.lastName}
                                      {appt.patientId?.patientId && (
                                        <span className="text-muted ms-1" style={{ fontSize: "11px" }}>
                                          #{appt.patientId.patientId}
                                        </span>
                                      )}
                                    </td>
                                    <td style={{ fontSize: "13px" }}>{appt.appointmentTypeId?.label || "-"}</td>
                                    <td>
                                      <Badge color={`soft-${cfg.color}`} style={{ fontSize: "10px" }}>
                                        {cfg.label}
                                      </Badge>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </CardBody>
                    </Card>
                  </Col>
                </Row>
              )}
            </>
          )}
        </Container>
      </div>
    </React.Fragment>
  );
};

/** Small card showing a single appointment's key details */
const AppointmentQuickCard = ({ appt, navigate, highlight }) => {
  const patient = appt?.patientId;
  if (!appt) return null;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-start mb-2">
        <div>
          <h5 className="mb-1">{patient?.firstName} {patient?.lastName}</h5>
          {patient?.patientId && (
            <span className="text-muted" style={{ fontSize: "12px" }}>#{patient.patientId}</span>
          )}
        </div>
        <Badge color={highlight ? "secondary" : "primary"} style={{ fontSize: "12px" }}>
          {formatTime(appt.startTime)}
          {appt.endTime ? ` - ${formatTime(appt.endTime)}` : ""}
        </Badge>
      </div>

      {appt.appointmentTypeId?.label && (
        <p className="text-muted mb-2" style={{ fontSize: "12px" }}>
          <i className="ri-information-line me-1"></i>{appt.appointmentTypeId.label}
        </p>
      )}

      {patient?.mobileNumber && (
        <p className="text-muted mb-2" style={{ fontSize: "12px" }}>
          <i className="ri-phone-line me-1"></i>{patient.mobileNumber}
        </p>
      )}

      <Button
        color={highlight ? "secondary" : "primary"}
        size="sm"
        className="w-100"
        onClick={() => navigate(`/consultation/${appt._id}`)}
      >
        <i className={`${highlight ? "ri-stethoscope-line" : "ri-arrow-right-line"} me-1`}></i>
        {highlight ? "Continue Consultation" : "Start Consultation"}
      </Button>
    </div>
  );
};

export default DoctorDashboard;
