import React, { useState, useEffect, useContext } from "react";
import {
  Card, CardBody, CardHeader, Col, Container, Row,
  Badge, Button, Input, Label,
  Nav, NavItem, NavLink, TabContent, TabPane,
  Modal, ModalHeader, ModalBody, ModalFooter,
} from "reactstrap";
import DataTable from "react-data-table-component";
import { useNavigate } from "react-router-dom";
import { getTodaysAppointments, searchAppointments, deleteAppointment, updateAppointmentStatus, transferAppointment } from "../../api/appointments.api";
import { getAllDoctors } from "../../api/doctors.api";
import Select from "react-select";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import DeleteModal from "../../Components/Common/DeleteModal";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/AuthContext";
import { MenuContext } from "../../context/MenuContext";
import { ROLES } from "../../constants/roles";
import classnames from "classnames";

const statusColors = {
  scheduled: "#4b38b3",
  confirmed: "#299cdb",
  arrived: "#f7b84b",
  in_consultation: "#6c757d",
  completed: "#0ab39c",
  checked_out: "#343a40",
  follow_up_planned: "#878a99",
  cancelled: "#f06548",
  no_show: "#f06548",
  rescheduled: "#f7b84b",
};

const statusBadgeColors = {
  scheduled: "primary",
  confirmed: "info",
  arrived: "warning",
  in_consultation: "secondary",
  completed: "success",
  checked_out: "dark",
  cancelled: "danger",
  no_show: "danger",
};

const SCHEDULE_START_HOUR = 8;
const SCHEDULE_END_HOUR = 20;
const SLOT_INTERVAL = 30; // minutes
const SLOT_HEIGHT = 48; // pixels per slot
const PX_PER_MIN = SLOT_HEIGHT / SLOT_INTERVAL;

const generateTimeSlots = (startHour = SCHEDULE_START_HOUR, endHour = SCHEDULE_END_HOUR, intervalMin = SLOT_INTERVAL) => {
  const slots = [];
  for (let h = startHour; h < endHour; h++) {
    for (let m = 0; m < 60; m += intervalMin) {
      const hh = String(h).padStart(2, "0");
      const mm = String(m).padStart(2, "0");
      slots.push(`${hh}:${mm}`);
    }
  }
  return slots;
};

/** Convert "HH:MM" to minutes from midnight */
const timeToMinutes = (t) => {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

/** Get top offset in px for a given time string relative to schedule start */
const timeToTop = (t) => {
  const mins = timeToMinutes(t);
  return (mins - SCHEDULE_START_HOUR * 60) * PX_PER_MIN;
};

/** Get height in px for a start→end time range */
const durationHeight = (start, end) => {
  const startMin = timeToMinutes(start);
  let endMin = timeToMinutes(end);
  if (endMin <= startMin) endMin = startMin + SLOT_INTERVAL; // fallback to 1 slot
  return (endMin - startMin) * PX_PER_MIN;
};

const formatDateISO = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateDisplay = (d) =>
  d.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });

const formatDate = (d) => {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const Appointments = () => {
  const { adminData } = useContext(AuthContext);
  const { currentPagePermissions } = useContext(MenuContext);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("schedule");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const isDoctor = adminData?.role === ROLES.DOCTOR;
  const [selectedDoctor, setSelectedDoctor] = useState(isDoctor ? adminData?._id : "");

  const [allData, setAllData] = useState([]);
  const [allLoading, setAllLoading] = useState(false);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(100);
  const [pageNo, setPageNo] = useState(0);
  const [column, setColumn] = useState();
  const [sortDirection, setSortDirection] = useState();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [remove_id, setRemoveId] = useState("");
  const [modal_delete, setModalDelete] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);

  // Status change confirmation modal
  const [statusModal, setStatusModal] = useState(false);
  const [statusChangeTarget, setStatusChangeTarget] = useState(null); // { appointmentId, newStatus, patientName }
  const [isStatusLoading, setIsStatusLoading] = useState(false);

  // Transfer modal
  const [transferModal, setTransferModal] = useState(false);
  const [transferTarget, setTransferTarget] = useState(null); // { appointmentId, patientName, currentDoctorId }
  const [transferDoctorId, setTransferDoctorId] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [isTransferLoading, setIsTransferLoading] = useState(false);

  const timeSlots = generateTimeSlots(8, 20, 30);

  useEffect(() => {
    getAllDoctors()
      .then((res) => { if (res.data.isOk) setDoctors(res.data.data || []); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (activeTab === "schedule") fetchSchedule();
  }, [activeTab, selectedDate, selectedDoctor]);

  useEffect(() => {
    if (activeTab === "list") fetchAll();
  }, [activeTab, pageNo, perPage, column, sortDirection, query, statusFilter, dateFrom, dateTo, selectedDoctor]);

  const fetchSchedule = async () => {
    setScheduleLoading(true);
    try {
      const dateStr = formatDateISO(selectedDate);
      const params = { skip: 0, per_page: 500, dateFrom: dateStr, dateTo: dateStr };
      if (selectedDoctor) params.doctorId = selectedDoctor;
      const res = await searchAppointments(params);
      if (res.data.data && res.data.data.length > 0) {
        setAppointments(res.data.data[0].data || []);
      } else {
        setAppointments([]);
      }
    } catch {
      setAppointments([]);
    }
    setScheduleLoading(false);
  };

  const fetchAll = async () => {
    setAllLoading(true);
    let skip = (pageNo - 1) * perPage;
    if (skip < 0) skip = 0;
    try {
      const params = { skip, per_page: perPage, sorton: column, sortdir: sortDirection, match: query };
      if (statusFilter) params.status = statusFilter;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      if (selectedDoctor) params.doctorId = selectedDoctor;
      const response = await searchAppointments(params);
      if (response.data.data && response.data.data.length > 0) {
        setAllData(response.data.data[0].data);
        setTotalRows(response.data.data[0].count);
      } else {
        setAllData([]);
        setTotalRows(0);
      }
    } catch {
      setAllData([]);
    }
    setAllLoading(false);
  };

  const openStatusModal = (appointmentId, newStatus, patientName) => {
    setStatusChangeTarget({ appointmentId, newStatus, patientName });
    setStatusModal(true);
  };

  const handleStatusConfirm = async () => {
    if (!statusChangeTarget) return;
    setIsStatusLoading(true);
    try {
      const res = await updateAppointmentStatus(statusChangeTarget.appointmentId, { status: statusChangeTarget.newStatus });
      if (res.data.isOk) {
        toast.success(res.data.message);
        if (activeTab === "schedule") fetchSchedule();
        else fetchAll();
      } else {
        toast.error(res.data.message);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update status");
    }
    setIsStatusLoading(false);
    setStatusModal(false);
    setStatusChangeTarget(null);
  };

  const openTransferModal = (appointmentId, patientName, currentDoctorId) => {
    setTransferTarget({ appointmentId, patientName, currentDoctorId });
    setTransferDoctorId("");
    setTransferReason("");
    setTransferModal(true);
  };

  const handleTransferConfirm = async () => {
    if (!transferTarget || !transferDoctorId) {
      toast.warning("Please select a doctor to transfer to");
      return;
    }
    setIsTransferLoading(true);
    try {
      const res = await transferAppointment(transferTarget.appointmentId, {
        newDoctorId: transferDoctorId,
        transferReason,
      });
      if (res.data.isOk) {
        toast.success("Appointment transferred successfully");
        setTransferModal(false);
        setTransferTarget(null);
        if (activeTab === "schedule") fetchSchedule();
        else fetchAll();
      } else {
        toast.error(res.data.message || "Transfer failed");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to transfer appointment");
    }
    setIsTransferLoading(false);
  };

  const handleDelete = (e) => {
    e.preventDefault();
    setIsDeleteLoading(true);
    deleteAppointment(remove_id)
      .then(() => {
        setModalDelete(false);
        toast.success("Appointment removed!");
        if (activeTab === "schedule") fetchSchedule();
        else fetchAll();
      })
      .catch(() => { setModalDelete(false); toast.error("Failed to delete."); })
      .finally(() => setIsDeleteLoading(false));
  };

  const navigateDate = (offset) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + offset);
    setSelectedDate(d);
  };

  const visibleDoctors = selectedDoctor
    ? doctors.filter((d) => d._id === selectedDoctor)
    : doctors;

  /** Get all visible appointments for a given doctor */
  const getAppointmentsForDoctor = (doctorId) => {
    return appointments.filter((a) => {
      const doc = a.doctor || a.doctorId;
      const docId = doc?._id || doc;
      return docId === doctorId && !["cancelled", "rescheduled"].includes(a.status);
    });
  };

  /** Check if a time slot is occupied by any appointment for a doctor */
  const isSlotOccupied = (time, doctorId) => {
    const slotMin = timeToMinutes(time);
    return appointments.some((a) => {
      const doc = a.doctor || a.doctorId;
      const docId = doc?._id || doc;
      if (docId !== doctorId || ["cancelled", "rescheduled"].includes(a.status)) return false;
      const aStart = timeToMinutes(a.startTime);
      const aEnd = a.endTime ? timeToMinutes(a.endTime) : aStart + SLOT_INTERVAL;
      return slotMin >= aStart && slotMin < aEnd;
    });
  };

  const getPatientName = (row) => {
    const p = row.patient || row.patientId;
    if (!p) return "-";
    return `${p.firstName || ""} ${p.lastName || ""}`.trim() || p.patientId || "-";
  };

  const nextStatusMap = {
    scheduled: "confirmed",
    confirmed: "arrived",
    arrived: "in_consultation",
    in_consultation: "completed",
    completed: "checked_out",
  };

  const handleSlotClick = (time, doctorId) => {
    const dateStr = formatDateISO(selectedDate);
    navigate(`/appointments/add?date=${dateStr}&time=${time}&doctor=${doctorId}`);
  };

  const allCols = [
    { name: "Date", selector: (row) => formatDate(row.appointmentDate), sortable: true, sortField: "appointmentDate", maxWidth: "110px" },
    { name: "Time", selector: (row) => row.startTime, maxWidth: "80px" },
    { name: "Patient", selector: (row) => getPatientName(row), minWidth: "150px" },
    // Hide doctor column for DOCTOR role (they only see their own appointments)
    ...(!isDoctor ? [{ name: "Doctor", selector: (row) => { const d = row.doctor || row.doctorId; return d?.doctorName || "-"; }, minWidth: "130px" }] : []),
    {
      name: "Type",
      selector: (row) => { const t = row.appointmentType || row.appointmentTypeId; return t?.label || "-"; },
      maxWidth: "120px",
    },
    {
      name: "Status",
      selector: (row) => (
        <Badge color={statusBadgeColors[row.status] || "secondary"} className="text-capitalize">
          {row.status?.replace(/_/g, " ")}
        </Badge>
      ),
      maxWidth: "140px",
    },
    { name: "Amount", selector: (row) => `₹${row.netAmount || 0}`, maxWidth: "100px" },
    {
      name: "Action",
      selector: (row) => (
        <div className="d-flex gap-1 flex-wrap">
          {currentPagePermissions.edit && nextStatusMap[row.status] && (
            <button
              className="btn btn-sm btn-soft-primary"
              onClick={() => openStatusModal(row._id, nextStatusMap[row.status], getPatientName(row))}
            >
              <i className="ri-arrow-right-s-line me-1"></i>
              {nextStatusMap[row.status].replace(/_/g, " ")}
            </button>
          )}
          {currentPagePermissions.read && (
            <button className="btn btn-sm btn-info" onClick={() => navigate(isDoctor ? `/consultation/${row._id}` : `/appointments/${row._id}`)}>
              {isDoctor ? "Consult" : "View"}
            </button>
          )}
          {currentPagePermissions.edit && ["scheduled", "confirmed"].includes(row.status) && (
            <button className="btn btn-sm btn-soft-warning" onClick={() => openTransferModal(row._id, getPatientName(row), row.doctorId?._id || row.doctorId)}>
              <i className="ri-share-forward-line me-1"></i>Transfer
            </button>
          )}
          {currentPagePermissions.edit && !["cancelled", "no_show", "checked_out", "follow_up_planned"].includes(row.status) && (
            <button className="btn btn-sm btn-success" onClick={() => navigate(`/appointments/${row._id}/edit`)}>Edit</button>
          )}
          {currentPagePermissions.delete && !["completed", "checked_out", "follow_up_planned"].includes(row.status) && (
            <button className="btn btn-sm btn-danger" onClick={() => { setModalDelete(true); setRemoveId(row._id); }}>Remove</button>
          )}
        </div>
      ),
      minWidth: "280px",
    },
  ];

  document.title = `Appointments | ${adminData?.companyName}`;

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <BreadCrumb maintitle="Appointments" title="Appointments" pageTitle="Appointments" />

          <Row className="mb-3 align-items-end">
            {!isDoctor && (
              <Col md={3}>
                <Label className="form-label">Doctor</Label>
                <Input type="select" value={selectedDoctor} onChange={(e) => setSelectedDoctor(e.target.value)}>
                  <option value="">All Doctors</option>
                  {doctors.map((d) => (
                    <option key={d._id} value={d._id}>{d.doctorName}</option>
                  ))}
                </Input>
              </Col>
            )}
            {activeTab === "schedule" && (
              <Col md={5}>
                <div className="d-flex align-items-center gap-2">
                  <Button color="soft-secondary" size="sm" onClick={() => navigateDate(-1)}>
                    <i className="ri-arrow-left-s-line"></i>
                  </Button>
                  <Button color="soft-primary" size="sm" onClick={() => setSelectedDate(new Date())}>Today</Button>
                  <Button color="soft-secondary" size="sm" onClick={() => navigateDate(1)}>
                    <i className="ri-arrow-right-s-line"></i>
                  </Button>
                  <Input
                    type="date"
                    value={formatDateISO(selectedDate)}
                    onChange={(e) => setSelectedDate(new Date(e.target.value + "T00:00:00"))}
                    style={{ width: "160px" }}
                  />
                  <span className="fw-semibold text-nowrap">{formatDateDisplay(selectedDate)}</span>
                </div>
              </Col>
            )}
            {activeTab === "list" && (
              <>
                <Col md={2}>
                  <Label className="form-label">Status</Label>
                  <Input type="select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="">All</option>
                    {Object.keys(statusBadgeColors).map((s) => (
                      <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                    ))}
                  </Input>
                </Col>
                <Col md={2}>
                  <Label className="form-label">From</Label>
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                </Col>
                <Col md={2}>
                  <Label className="form-label">To</Label>
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </Col>
                <Col md={3}>
                  <Label className="form-label">Search</Label>
                  <Input type="text" placeholder="Search patient, doctor..." value={query} onChange={(e) => setQuery(e.target.value)} />
                </Col>
              </>
            )}
          </Row>

          <Card>
            <CardHeader className="d-flex justify-content-between align-items-center">
              <Nav className="nav-tabs-custom card-header-tabs" role="tablist">
                <NavItem>
                  <NavLink className={classnames({ active: activeTab === "schedule" })} onClick={() => setActiveTab("schedule")} href="#">
                    <i className="ri-calendar-line me-1"></i>Schedule
                  </NavLink>
                </NavItem>
                <NavItem>
                  <NavLink className={classnames({ active: activeTab === "list" })} onClick={() => setActiveTab("list")} href="#">
                    <i className="ri-list-check me-1"></i>All Appointments
                  </NavLink>
                </NavItem>
              </Nav>
              {currentPagePermissions.write && (
                <Button color="success" size="sm" onClick={() => navigate("/appointments/add")}>
                  <i className="ri-add-line me-1"></i>New Appointment
                </Button>
              )}
            </CardHeader>
            <CardBody className="p-0">
              <TabContent activeTab={activeTab}>
                <TabPane tabId="schedule">
                  {scheduleLoading ? (
                    <div className="text-center py-5"><span className="spinner-border"></span></div>
                  ) : visibleDoctors.length === 0 ? (
                    <div className="text-center py-5 text-muted">No doctors available. Add doctors in Setup first.</div>
                  ) : (
                    <div style={{ maxHeight: "70vh", overflowY: "auto", overflowX: "auto" }}>
                      {/* Sticky header row */}
                      <div className="d-flex border-bottom bg-light" style={{ position: "sticky", top: 0, zIndex: 3 }}>
                        <div
                          className="text-center fw-semibold text-muted d-flex align-items-center justify-content-center border-end bg-light"
                          style={{ width: "70px", minWidth: "70px", padding: "8px 0", fontSize: "12px" }}
                        >
                          Time
                        </div>
                        {visibleDoctors.map((doc) => (
                          <div
                            key={doc._id}
                            className="text-center border-end bg-light"
                            style={{ flex: "1 0 180px", minWidth: "180px", padding: "6px 4px" }}
                          >
                            <div className="fw-semibold">{doc.doctorName}</div>
                            <small className="text-muted">{doc.doctorCode}</small>
                          </div>
                        ))}
                      </div>

                      {/* Grid body: time labels + doctor columns */}
                      <div className="d-flex" style={{ position: "relative" }}>
                        {/* Time label column */}
                        <div style={{ width: "70px", minWidth: "70px" }} className="border-end">
                          {timeSlots.map((time) => (
                            <div
                              key={time}
                              className="text-center fw-semibold text-muted d-flex align-items-start justify-content-center bg-light border-bottom"
                              style={{ height: `${SLOT_HEIGHT}px`, fontSize: "11px", paddingTop: "2px" }}
                            >
                              {time}
                            </div>
                          ))}
                        </div>

                        {/* Doctor columns */}
                        {visibleDoctors.map((doc) => {
                          const docAppts = getAppointmentsForDoctor(doc._id);
                          const totalHeight = timeSlots.length * SLOT_HEIGHT;

                          return (
                            <div
                              key={doc._id}
                              className="border-end"
                              style={{ flex: "1 0 180px", minWidth: "180px", position: "relative", height: `${totalHeight}px` }}
                            >
                              {/* Slot grid lines (clickable empty areas) */}
                              {timeSlots.map((time) => {
                                const occupied = isSlotOccupied(time, doc._id);
                                return (
                                  <div
                                    key={time}
                                    className="border-bottom"
                                    style={{
                                      height: `${SLOT_HEIGHT}px`,
                                      cursor: !occupied && currentPagePermissions.write ? "pointer" : "default",
                                    }}
                                    onClick={() => {
                                      if (!occupied && currentPagePermissions.write) handleSlotClick(time, doc._id);
                                    }}
                                    title={!occupied && currentPagePermissions.write ? "Click to book" : ""}
                                  >
                                    {!occupied && currentPagePermissions.write && (
                                      <div className="text-center text-muted" style={{ fontSize: "18px", opacity: 0.15, lineHeight: `${SLOT_HEIGHT}px` }}>+</div>
                                    )}
                                  </div>
                                );
                              })}

                              {/* Appointment cards (absolutely positioned) */}
                              {docAppts.map((appt) => {
                                const top = timeToTop(appt.startTime);
                                const height = durationHeight(appt.startTime, appt.endTime);
                                const color = statusColors[appt.status] || "#6c757d";

                                return (
                                  <div
                                    key={appt._id}
                                    onClick={() => navigate(isDoctor ? `/consultation/${appt._id}` : `/appointments/${appt._id}`)}
                                    style={{
                                      position: "absolute",
                                      top: `${top}px`,
                                      left: "2px",
                                      right: "2px",
                                      height: `${height}px`,
                                      backgroundColor: `${color}18`,
                                      borderLeft: `3px solid ${color}`,
                                      borderRadius: "4px",
                                      cursor: "pointer",
                                      overflow: "hidden",
                                      padding: "3px 6px",
                                      zIndex: 1,
                                      display: "flex",
                                      flexDirection: "column",
                                      justifyContent: "space-between",
                                      transition: "box-shadow 0.15s",
                                      boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.18)"; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.08)"; }}
                                  >
                                    <div>
                                      <div className="fw-semibold text-truncate" style={{ fontSize: "11px", lineHeight: "1.3" }}>
                                        {getPatientName(appt)}
                                      </div>
                                      {height >= 40 && (
                                        <div className="text-muted" style={{ fontSize: "10px" }}>
                                          {appt.startTime} – {appt.endTime || "—"}
                                        </div>
                                      )}
                                    </div>
                                    <div className="d-flex justify-content-between align-items-center">
                                      <Badge
                                        color={statusBadgeColors[appt.status] || "secondary"}
                                        className="text-capitalize"
                                        style={{ fontSize: "9px" }}
                                      >
                                        {appt.status?.replace(/_/g, " ")}
                                      </Badge>
                                      <div className="d-flex align-items-center gap-1">
                                        {appt.isEmergency && (
                                          <Badge color="danger" style={{ fontSize: "8px" }}>SOS</Badge>
                                        )}
                                        {["scheduled", "confirmed"].includes(appt.status) && currentPagePermissions.edit && (
                                          <button
                                            className="btn btn-soft-warning btn-sm px-1 py-0"
                                            style={{ fontSize: "9px", lineHeight: "16px" }}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              openTransferModal(appt._id, getPatientName(appt), appt.doctorId?._id || appt.doctorId);
                                            }}
                                            title="Transfer"
                                          >
                                            <i className="ri-share-forward-line" style={{ fontSize: "10px" }}></i>
                                          </button>
                                        )}
                                        {nextStatusMap[appt.status] && currentPagePermissions.edit && (
                                          <button
                                            className="btn btn-soft-primary btn-sm px-1 py-0"
                                            style={{ fontSize: "9px", lineHeight: "16px", whiteSpace: "nowrap" }}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              openStatusModal(appt._id, nextStatusMap[appt.status], getPatientName(appt));
                                            }}
                                          >
                                            <i className="ri-arrow-right-s-line" style={{ fontSize: "10px" }}></i>
                                            {nextStatusMap[appt.status].replace(/_/g, " ")}
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </TabPane>

                <TabPane tabId="list" className="p-3">
                  <DataTable
                    columns={allCols}
                    data={allData}
                    progressPending={allLoading}
                    sortServer
                    onSort={(col, dir) => { setColumn(col.sortField); setSortDirection(dir); }}
                    pagination
                    paginationServer
                    paginationTotalRows={totalRows}
                    paginationPerPage={100}
                    paginationRowsPerPageOptions={[50, 100, 200, 300]}
                    onChangeRowsPerPage={(n) => setPerPage(n)}
                    onChangePage={(p) => setPageNo(p)}
                  />
                </TabPane>
              </TabContent>
            </CardBody>
          </Card>
        </Container>
      </div>
      <DeleteModal
        show={modal_delete}
        handleDelete={handleDelete}
        toggle={() => setModalDelete(false)}
        setmodal_delete={setModalDelete}
        disabled={isDeleteLoading}
      />

      {/* Status Change Confirmation Modal */}
      <Modal isOpen={statusModal} toggle={() => { if (!isStatusLoading) { setStatusModal(false); setStatusChangeTarget(null); } }} centered>
        <ModalHeader toggle={() => { if (!isStatusLoading) { setStatusModal(false); setStatusChangeTarget(null); } }}>
          Confirm Status Change
        </ModalHeader>
        <ModalBody>
          {statusChangeTarget && (
            <div className="text-center">
              <div className="mb-3">
                <i className="ri-arrow-right-circle-line text-primary" style={{ fontSize: "48px" }}></i>
              </div>
              <h5 className="mb-2">
                Move to <Badge color={statusBadgeColors[statusChangeTarget.newStatus] || "secondary"} className="text-capitalize fs-6">
                  {statusChangeTarget.newStatus.replace(/_/g, " ")}
                </Badge>?
              </h5>
              <p className="text-muted mb-0">
                Patient: <strong>{statusChangeTarget.patientName}</strong>
              </p>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="light" onClick={() => { setStatusModal(false); setStatusChangeTarget(null); }} disabled={isStatusLoading}>
            Cancel
          </Button>
          <Button color="primary" onClick={handleStatusConfirm} disabled={isStatusLoading}>
            {isStatusLoading ? <><span className="spinner-border spinner-border-sm me-1"></span>Updating...</> : "Confirm"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Transfer Appointment Modal */}
      <Modal isOpen={transferModal} toggle={() => { if (!isTransferLoading) { setTransferModal(false); setTransferTarget(null); } }} centered>
        <ModalHeader toggle={() => { if (!isTransferLoading) { setTransferModal(false); setTransferTarget(null); } }}>
          Transfer Appointment
        </ModalHeader>
        <ModalBody>
          {transferTarget && (
            <div>
              <p className="mb-3">
                Transfer appointment for <strong>{transferTarget.patientName}</strong> to another doctor.
              </p>
              <div className="mb-3">
                <Label className="form-label">Transfer To Doctor <span className="text-danger">*</span></Label>
                <Select
                  options={doctors
                    .filter((d) => d._id !== transferTarget.currentDoctorId)
                    .map((d) => ({ value: d._id, label: `Dr. ${d.doctorName}` }))}
                  value={transferDoctorId ? {
                    value: transferDoctorId,
                    label: `Dr. ${doctors.find((d) => d._id === transferDoctorId)?.doctorName || ""}`,
                  } : null}
                  onChange={(opt) => setTransferDoctorId(opt?.value || "")}
                  placeholder="Select doctor..."
                  isClearable
                />
              </div>
              <div className="mb-3">
                <Label className="form-label">Reason for Transfer</Label>
                <Input
                  type="textarea"
                  rows="2"
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  placeholder="e.g. Specialist referral, doctor unavailable..."
                />
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="light" onClick={() => { setTransferModal(false); setTransferTarget(null); }} disabled={isTransferLoading}>
            Cancel
          </Button>
          <Button color="warning" onClick={handleTransferConfirm} disabled={isTransferLoading || !transferDoctorId}>
            {isTransferLoading ? <><span className="spinner-border spinner-border-sm me-1"></span>Transferring...</> : <><i className="ri-share-forward-line me-1"></i>Transfer</>}
          </Button>
        </ModalFooter>
      </Modal>
    </React.Fragment>
  );
};

export default Appointments;
