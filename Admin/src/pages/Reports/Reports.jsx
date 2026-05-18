import React, { useState, useEffect, useContext } from "react";
import {
  Container, Row, Col, Card, CardBody, CardHeader,
  Nav, NavItem, NavLink, TabContent, TabPane,
  Input, Label, Button, Badge, Spinner,
  Table, Progress,
} from "reactstrap";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import { AuthContext } from "../../context/AuthContext";
import { ROLES } from "../../constants/roles";
import {
  getAppointmentSummaryReport,
  getRevenueReport,
  getPatientReport,
  getFollowUpReport,
  getDoctorUtilizationReport,
} from "../../api/analytics.api";
import { getAllDoctors } from "../../api/doctors.api";
import classnames from "classnames";

const formatCurrency = (n) => {
  if (n == null) return "₹0";
  return `₹${Number(n).toLocaleString("en-IN")}`;
};

const formatDate = (d) => {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const formatDateShort = (d) => {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
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

const getDefaultDateRange = () => {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  const fmt = (d) => d.toISOString().split("T")[0];
  return { dateFrom: fmt(from), dateTo: fmt(to) };
};

const Reports = () => {
  const { adminData } = useContext(AuthContext);
  const isDoctor = adminData?.role === ROLES.DOCTOR;
  const [activeTab, setActiveTab] = useState("appointments");
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(isDoctor ? adminData?._id : "");
  const { dateFrom: defFrom, dateTo: defTo } = getDefaultDateRange();
  const [dateFrom, setDateFrom] = useState(defFrom);
  const [dateTo, setDateTo] = useState(defTo);

  // Report data states
  const [apptReport, setApptReport] = useState(null);
  const [revenueReport, setRevenueReport] = useState(null);
  const [patientReport, setPatientReport] = useState(null);
  const [followUpReport, setFollowUpReport] = useState(null);
  const [utilizationReport, setUtilizationReport] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getAllDoctors()
      .then((res) => { if (res.data.isOk) setDoctors(res.data.data || []); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchCurrentTab();
  }, [activeTab]);

  const buildParams = () => {
    const p = {};
    if (dateFrom) p.dateFrom = dateFrom;
    if (dateTo) p.dateTo = dateTo;
    if (selectedDoctor) p.doctorId = selectedDoctor;
    return p;
  };

  const fetchCurrentTab = async () => {
    setLoading(true);
    const params = buildParams();
    try {
      switch (activeTab) {
        case "appointments": {
          const res = await getAppointmentSummaryReport(params);
          if (res.data.isOk) setApptReport(res.data.data);
          break;
        }
        case "revenue": {
          const res = await getRevenueReport(params);
          if (res.data.isOk) setRevenueReport(res.data.data);
          break;
        }
        case "patients": {
          const res = await getPatientReport(params);
          if (res.data.isOk) setPatientReport(res.data.data);
          break;
        }
        case "followups": {
          const res = await getFollowUpReport(params);
          if (res.data.isOk) setFollowUpReport(res.data.data);
          break;
        }
        case "utilization": {
          const res = await getDoctorUtilizationReport(params);
          if (res.data.isOk) setUtilizationReport(res.data.data);
          break;
        }
      }
    } catch {
      // silently fail
    }
    setLoading(false);
  };

  const handleApplyFilters = () => {
    fetchCurrentTab();
  };

  const allTabs = [
    { id: "appointments", label: "Appointments", icon: "ri-calendar-check-line" },
    { id: "revenue", label: "Revenue", icon: "ri-money-rupee-circle-line", hideForDoctor: true },
    { id: "patients", label: "Patients", icon: "ri-user-heart-line", hideForDoctor: true },
    { id: "followups", label: "Follow-Ups", icon: "ri-phone-line" },
    { id: "utilization", label: "Doctor Utilization", icon: "ri-stethoscope-line", hideForDoctor: true },
  ];
  const tabs = isDoctor ? allTabs.filter((t) => !t.hideForDoctor) : allTabs;

  document.title = `Reports | ${adminData?.companyName}`;

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <BreadCrumb maintitle="Reports" title="Reports" pageTitle="Analytics" />

          {/* Filters */}
          <Card className="mb-3">
            <CardBody className="py-2">
              <Row className="align-items-end g-3">
                <Col md={2}>
                  <Label className="form-label mb-1" style={{ fontSize: "12px" }}>From</Label>
                  <Input type="date" bsSize="sm" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                </Col>
                <Col md={2}>
                  <Label className="form-label mb-1" style={{ fontSize: "12px" }}>To</Label>
                  <Input type="date" bsSize="sm" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </Col>
                {!isDoctor && (
                  <Col md={3}>
                    <Label className="form-label mb-1" style={{ fontSize: "12px" }}>Doctor</Label>
                    <Input type="select" bsSize="sm" value={selectedDoctor} onChange={(e) => setSelectedDoctor(e.target.value)}>
                      <option value="">All Doctors</option>
                      {doctors.map((d) => (
                        <option key={d._id} value={d._id}>{d.doctorName}</option>
                      ))}
                    </Input>
                  </Col>
                )}
                <Col md={2}>
                  <Button color="primary" size="sm" onClick={handleApplyFilters} disabled={loading}>
                    <i className="ri-filter-line me-1"></i>Apply
                  </Button>
                </Col>
              </Row>
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="p-0 border-bottom">
              <Nav className="nav-tabs nav-tabs-custom" role="tablist">
                {tabs.map((tab) => (
                  <NavItem key={tab.id}>
                    <NavLink
                      className={classnames({ active: activeTab === tab.id })}
                      onClick={() => setActiveTab(tab.id)}
                      href="#"
                      style={{ fontSize: "13px" }}
                    >
                      <i className={`${tab.icon} me-1`}></i>{tab.label}
                    </NavLink>
                  </NavItem>
                ))}
              </Nav>
            </CardHeader>
            <CardBody>
              {loading ? (
                <div className="text-center py-5"><Spinner color="primary" /></div>
              ) : (
                <TabContent activeTab={activeTab}>
                  {/* Appointments Report */}
                  <TabPane tabId="appointments">
                    <AppointmentReport data={apptReport} />
                  </TabPane>

                  {/* Revenue Report */}
                  <TabPane tabId="revenue">
                    <RevenueReport data={revenueReport} />
                  </TabPane>

                  {/* Patients Report */}
                  <TabPane tabId="patients">
                    <PatientReport data={patientReport} />
                  </TabPane>

                  {/* Follow-Up Report */}
                  <TabPane tabId="followups">
                    <FollowUpReport data={followUpReport} />
                  </TabPane>

                  {/* Utilization Report */}
                  <TabPane tabId="utilization">
                    <UtilizationReport data={utilizationReport} />
                  </TabPane>
                </TabContent>
              )}
            </CardBody>
          </Card>
        </Container>
      </div>
    </React.Fragment>
  );
};

/* ============ SUB-COMPONENTS ============ */

const StatCard = ({ label, value, color = "primary", icon }) => (
  <Card className="border mb-0">
    <CardBody className="py-3 px-3">
      <div className="d-flex align-items-center gap-2">
        {icon && <i className={`${icon} text-${color}`} style={{ fontSize: "18px" }}></i>}
        <div>
          <p className="text-muted mb-0" style={{ fontSize: "11px" }}>{label}</p>
          <h5 className={`mb-0 text-${color}`}>{value}</h5>
        </div>
      </div>
    </CardBody>
  </Card>
);

const EmptyState = ({ message }) => (
  <div className="text-center text-muted py-5">
    <i className="ri-bar-chart-line" style={{ fontSize: "48px", opacity: 0.2 }}></i>
    <p className="mt-2">{message || "No data available for the selected period."}</p>
  </div>
);

/* ---- Appointments Report ---- */
const AppointmentReport = ({ data }) => {
  if (!data) return <EmptyState />;

  const totalByStatus = data.totalByStatus || {};
  const total = Object.values(totalByStatus).reduce((s, v) => s + v, 0);

  return (
    <>
      {/* Status Summary */}
      <h6 className="text-muted mb-3">Status Summary</h6>
      <Row className="mb-4 g-3">
        <Col xs={6} md={3}>
          <StatCard label="Total" value={total} color="primary" icon="ri-calendar-line" />
        </Col>
        <Col xs={6} md={3}>
          <StatCard label="Completed" value={totalByStatus.completed || 0} color="success" icon="ri-check-line" />
        </Col>
        <Col xs={6} md={3}>
          <StatCard label="Cancelled" value={totalByStatus.cancelled || 0} color="danger" icon="ri-close-line" />
        </Col>
        <Col xs={6} md={3}>
          <StatCard label="No Show" value={totalByStatus.no_show || 0} color="warning" icon="ri-user-unfollow-line" />
        </Col>
      </Row>

      <Row>
        {/* By Doctor */}
        <Col md={6}>
          <h6 className="text-muted mb-2">By Doctor</h6>
          <Table size="sm" bordered hover responsive className="mb-4">
            <thead className="table-light">
              <tr>
                <th>Doctor</th>
                <th className="text-center">Total</th>
                <th className="text-center">Completed</th>
                <th className="text-center">Cancelled</th>
                <th className="text-center">No Show</th>
              </tr>
            </thead>
            <tbody>
              {(data.byDoctor || []).length === 0 ? (
                <tr><td colSpan={5} className="text-center text-muted">No data</td></tr>
              ) : (
                data.byDoctor.map((d, i) => (
                  <tr key={i}>
                    <td>{d.doctorName || "-"}</td>
                    <td className="text-center">{d.total || 0}</td>
                    <td className="text-center text-success">{d.completed || 0}</td>
                    <td className="text-center text-danger">{d.cancelled || 0}</td>
                    <td className="text-center text-warning">{d.noShow || 0}</td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </Col>

        {/* By Day of Week */}
        <Col md={6}>
          <h6 className="text-muted mb-2">By Day of Week</h6>
          <Table size="sm" bordered hover responsive className="mb-4">
            <thead className="table-light">
              <tr>
                <th>Day</th>
                <th className="text-center">Appointments</th>
                <th>Distribution</th>
              </tr>
            </thead>
            <tbody>
              {(data.byDayOfWeek || []).map((d, i) => {
                const maxCount = Math.max(...(data.byDayOfWeek || []).map((x) => x.count || 0), 1);
                return (
                  <tr key={i}>
                    <td>{d.day}</td>
                    <td className="text-center">{d.count || 0}</td>
                    <td style={{ width: "40%" }}>
                      <Progress value={(d.count / maxCount) * 100} color="primary" style={{ height: "8px" }} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Col>
      </Row>

      <Row>
        {/* By Source */}
        <Col md={6}>
          <h6 className="text-muted mb-2">By Source</h6>
          <Table size="sm" bordered hover responsive>
            <thead className="table-light">
              <tr><th>Source</th><th className="text-center">Count</th></tr>
            </thead>
            <tbody>
              {(data.bySource || []).length === 0 ? (
                <tr><td colSpan={2} className="text-center text-muted">No data</td></tr>
              ) : (
                data.bySource.map((s, i) => (
                  <tr key={i}><td>{s.source || "Unknown"}</td><td className="text-center">{s.count}</td></tr>
                ))
              )}
            </tbody>
          </Table>
        </Col>

        {/* By Type */}
        <Col md={6}>
          <h6 className="text-muted mb-2">By Type</h6>
          <Table size="sm" bordered hover responsive>
            <thead className="table-light">
              <tr><th>Type</th><th className="text-center">Count</th></tr>
            </thead>
            <tbody>
              {(data.byType || []).length === 0 ? (
                <tr><td colSpan={2} className="text-center text-muted">No data</td></tr>
              ) : (
                data.byType.map((t, i) => (
                  <tr key={i}><td>{t.type || "Unknown"}</td><td className="text-center">{t.count}</td></tr>
                ))
              )}
            </tbody>
          </Table>
        </Col>
      </Row>
    </>
  );
};

/* ---- Revenue Report ---- */
const RevenueReport = ({ data }) => {
  if (!data) return <EmptyState />;

  return (
    <>
      <Row className="mb-4 g-3">
        <Col xs={6} md={3}>
          <StatCard label="Total Collected" value={formatCurrency(data.totalCollected)} color="success" icon="ri-money-rupee-circle-line" />
        </Col>
        <Col xs={6} md={3}>
          <StatCard label="Total Outstanding" value={formatCurrency(data.totalOutstanding)} color="danger" icon="ri-error-warning-line" />
        </Col>
      </Row>

      <Row>
        {/* By Payment Method */}
        <Col md={6}>
          <h6 className="text-muted mb-2">By Payment Method</h6>
          <Table size="sm" bordered hover responsive className="mb-4">
            <thead className="table-light">
              <tr><th>Method</th><th className="text-center">Count</th><th className="text-end">Amount</th></tr>
            </thead>
            <tbody>
              {(data.byPaymentMethod || []).length === 0 ? (
                <tr><td colSpan={3} className="text-center text-muted">No data</td></tr>
              ) : (
                data.byPaymentMethod.map((m, i) => (
                  <tr key={i}>
                    <td>{m.method || "Unknown"}</td>
                    <td className="text-center">{m.count}</td>
                    <td className="text-end">{formatCurrency(m.amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </Col>

        {/* By Doctor */}
        <Col md={6}>
          <h6 className="text-muted mb-2">Revenue by Doctor</h6>
          <Table size="sm" bordered hover responsive className="mb-4">
            <thead className="table-light">
              <tr><th>Doctor</th><th className="text-center">Invoices</th><th className="text-end">Revenue</th></tr>
            </thead>
            <tbody>
              {(data.byDoctor || []).length === 0 ? (
                <tr><td colSpan={3} className="text-center text-muted">No data</td></tr>
              ) : (
                data.byDoctor.map((d, i) => (
                  <tr key={i}>
                    <td>{d.doctorName || "-"}</td>
                    <td className="text-center">{d.invoiceCount}</td>
                    <td className="text-end">{formatCurrency(d.revenue)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </Col>
      </Row>

      {/* Daily Revenue */}
      <h6 className="text-muted mb-2">Daily Revenue</h6>
      <div style={{ maxHeight: "300px", overflowY: "auto" }}>
        <Table size="sm" bordered hover responsive>
          <thead className="table-light" style={{ position: "sticky", top: 0 }}>
            <tr><th>Date</th><th className="text-end">Amount</th><th>Bar</th></tr>
          </thead>
          <tbody>
            {(data.dailyRevenue || []).length === 0 ? (
              <tr><td colSpan={3} className="text-center text-muted">No data</td></tr>
            ) : (
              data.dailyRevenue.map((d, i) => {
                const maxAmt = Math.max(...(data.dailyRevenue || []).map((x) => x.amount || 0), 1);
                return (
                  <tr key={i}>
                    <td>{formatDate(d.date)}</td>
                    <td className="text-end">{formatCurrency(d.amount)}</td>
                    <td style={{ width: "40%" }}>
                      <Progress value={(d.amount / maxAmt) * 100} color="success" style={{ height: "8px" }} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </Table>
      </div>
    </>
  );
};

/* ---- Patient Report ---- */
const PatientReport = ({ data }) => {
  if (!data) return <EmptyState />;

  return (
    <>
      <Row className="mb-4 g-3">
        <Col xs={6} md={3}>
          <StatCard label="New Registrations" value={data.newRegistrations || 0} color="success" icon="ri-user-add-line" />
        </Col>
      </Row>

      <Row>
        {/* By Referral Source */}
        <Col md={6}>
          <h6 className="text-muted mb-2">By Referral Source</h6>
          <Table size="sm" bordered hover responsive className="mb-4">
            <thead className="table-light">
              <tr><th>Source</th><th className="text-center">Count</th></tr>
            </thead>
            <tbody>
              {(data.byReferralSource || []).length === 0 ? (
                <tr><td colSpan={2} className="text-center text-muted">No data</td></tr>
              ) : (
                data.byReferralSource.map((s, i) => (
                  <tr key={i}><td>{s.source || "Not specified"}</td><td className="text-center">{s.count}</td></tr>
                ))
              )}
            </tbody>
          </Table>
        </Col>

        {/* Registration Trend */}
        <Col md={6}>
          <h6 className="text-muted mb-2">Registration Trend</h6>
          <div style={{ maxHeight: "300px", overflowY: "auto" }}>
            <Table size="sm" bordered hover responsive>
              <thead className="table-light" style={{ position: "sticky", top: 0 }}>
                <tr><th>Date</th><th className="text-center">New Patients</th><th>Trend</th></tr>
              </thead>
              <tbody>
                {(data.registrationTrend || []).length === 0 ? (
                  <tr><td colSpan={3} className="text-center text-muted">No data</td></tr>
                ) : (
                  data.registrationTrend.map((d, i) => {
                    const maxC = Math.max(...(data.registrationTrend || []).map((x) => x.count || 0), 1);
                    return (
                      <tr key={i}>
                        <td>{formatDateShort(d.date)}</td>
                        <td className="text-center">{d.count}</td>
                        <td style={{ width: "40%" }}>
                          <Progress value={(d.count / maxC) * 100} color="info" style={{ height: "8px" }} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </Table>
          </div>
        </Col>
      </Row>
    </>
  );
};

/* ---- Follow-Up Report ---- */
const FollowUpReport = ({ data }) => {
  if (!data) return <EmptyState />;

  return (
    <>
      <Row className="mb-4 g-3">
        <Col xs={6} md={2}>
          <StatCard label="Total Suggested" value={data.totalSuggested || 0} color="primary" icon="ri-phone-line" />
        </Col>
        <Col xs={6} md={2}>
          <StatCard label="Confirmed" value={data.confirmed || 0} color="info" icon="ri-check-double-line" />
        </Col>
        <Col xs={6} md={2}>
          <StatCard label="Completed" value={data.completed || 0} color="success" icon="ri-check-line" />
        </Col>
        <Col xs={6} md={2}>
          <StatCard label="Overdue" value={data.overdue || 0} color="danger" icon="ri-alarm-warning-line" />
        </Col>
        <Col xs={6} md={2}>
          <StatCard label="Cancelled" value={data.cancelled || 0} color="secondary" icon="ri-close-line" />
        </Col>
        <Col xs={6} md={2}>
          <StatCard label="Compliance Rate" value={`${data.complianceRate || 0}%`} color="success" icon="ri-pie-chart-line" />
        </Col>
      </Row>

      <h6 className="text-muted mb-2">By Doctor</h6>
      <Table size="sm" bordered hover responsive>
        <thead className="table-light">
          <tr>
            <th>Doctor</th>
            <th className="text-center">Suggested</th>
            <th className="text-center">Confirmed</th>
            <th className="text-center">Completed</th>
            <th className="text-center">Rate</th>
          </tr>
        </thead>
        <tbody>
          {(data.byDoctor || []).length === 0 ? (
            <tr><td colSpan={5} className="text-center text-muted">No data</td></tr>
          ) : (
            data.byDoctor.map((d, i) => {
              const rate = d.suggested > 0 ? ((d.completed / d.suggested) * 100).toFixed(0) : 0;
              return (
                <tr key={i}>
                  <td>{d.doctorName || "-"}</td>
                  <td className="text-center">{d.suggested}</td>
                  <td className="text-center">{d.confirmed}</td>
                  <td className="text-center">{d.completed}</td>
                  <td className="text-center">
                    <Badge color={rate >= 70 ? "success" : rate >= 40 ? "warning" : "danger"}>
                      {rate}%
                    </Badge>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </Table>
    </>
  );
};

/* ---- Doctor Utilization Report ---- */
const UtilizationReport = ({ data }) => {
  if (!data || !data.doctors) return <EmptyState />;

  return (
    <>
      <Table bordered hover responsive>
        <thead className="table-light">
          <tr>
            <th>Doctor</th>
            <th className="text-center">Total Slots</th>
            <th className="text-center">Occupied</th>
            <th className="text-center">Utilization</th>
            <th className="text-center">Avg Patients/Day</th>
            <th className="text-end">Revenue</th>
          </tr>
        </thead>
        <tbody>
          {data.doctors.length === 0 ? (
            <tr><td colSpan={6} className="text-center text-muted">No data</td></tr>
          ) : (
            data.doctors.map((d, i) => (
              <tr key={i}>
                <td className="fw-semibold">{d.doctorName || "-"}</td>
                <td className="text-center">{d.totalSlots}</td>
                <td className="text-center">{d.occupiedSlots}</td>
                <td className="text-center" style={{ width: "200px" }}>
                  <div className="d-flex align-items-center gap-2">
                    <Progress
                      value={d.utilizationPercent || 0}
                      color={d.utilizationPercent >= 70 ? "success" : d.utilizationPercent >= 40 ? "warning" : "danger"}
                      style={{ height: "8px", flex: 1 }}
                    />
                    <span className="fw-semibold" style={{ fontSize: "12px", minWidth: "35px" }}>
                      {(d.utilizationPercent || 0).toFixed(0)}%
                    </span>
                  </div>
                </td>
                <td className="text-center">{(d.avgPatientsPerDay || 0).toFixed(1)}</td>
                <td className="text-end">{formatCurrency(d.totalRevenue)}</td>
              </tr>
            ))
          )}
        </tbody>
      </Table>
    </>
  );
};

export default Reports;
