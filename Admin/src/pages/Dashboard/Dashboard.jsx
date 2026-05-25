import React, { useState, useEffect, useContext } from "react";
import {
  Container, Row, Col, Card, CardBody, CardHeader,
  Badge, Spinner, Button,
} from "reactstrap";
import { useNavigate } from "react-router-dom";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import { AuthContext } from "../../context/AuthContext";
import { getDashboardStats } from "../../api/analytics.api";
const dashboardStyles = `
.vy-dashboard {
  font-family: var(--vy-font-body, 'Manrope', sans-serif);
}
.vy-dashboard .vy-greeting {
  font-family: var(--vy-font-display, 'Barlow', sans-serif);
  font-weight: 700;
  font-size: 28px;
  letter-spacing: -0.015em;
  color: var(--vy-ink, #0A0B0A);
  margin: 0;
}
.vy-dashboard .vy-greeting .accent { color: var(--vy-lime-700, #145c2e); }
.vy-dashboard .vy-sub {
  color: var(--vy-fg-2, #5C5F58);
  font-size: 14px;
  margin-top: 4px;
  margin-bottom: 0;
}

.vy-dashboard .card,
.vy-dashboard .vy-card {
  background: #FFFFFF;
  border: 1px solid var(--vy-line-1, #D2D6CB);
  border-radius: 8px;
  box-shadow: none;
  transition: border-color 120ms ease;
}
.vy-dashboard .card-animate:hover { border-color: var(--vy-line-2, #B9BEB1); }

.vy-dashboard .vy-eyebrow {
  font-family: var(--vy-font-display, 'Barlow', sans-serif);
  font-weight: 600;
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--vy-fg-2, #5C5F58);
  margin: 0;
}
.vy-dashboard .vy-metric-num {
  font-family: var(--vy-font-display, 'Barlow', sans-serif);
  font-weight: 700;
  font-size: 36px;
  line-height: 1.05;
  letter-spacing: -0.02em;
  color: var(--vy-ink, #0A0B0A);
  font-feature-settings: "tnum" 1;
  margin: 12px 0 0 0;
}
.vy-dashboard .vy-metric-delta {
  font-family: var(--vy-font-mono, 'JetBrains Mono', monospace);
  font-size: 12px;
  margin-top: 6px;
}
.vy-dashboard .vy-metric-delta.up { color: #4FAB5A; }
.vy-dashboard .vy-metric-delta.down { color: var(--vy-danger, #FF6A55); }
.vy-dashboard .vy-metric-delta.flat { color: var(--vy-fg-3, #8E918A); }

.vy-dashboard .vy-icon-square {
  width: 36px; height: 36px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--vy-bg-2, #EDEFE8);
  color: var(--vy-ink, #0A0B0A);
  font-size: 18px;
}
.vy-dashboard .vy-icon-square.accent {
  background: rgba(200, 255, 61, 0.18);
  color: var(--vy-lime-700, #145c2e);
}

.vy-dashboard h6.card-title {
  font-family: var(--vy-font-display, 'Barlow', sans-serif);
  font-weight: 600;
  font-size: 14px;
  color: var(--vy-ink, #0A0B0A);
  margin: 0;
}
.vy-dashboard .card-header {
  background: transparent;
  border-bottom: 1px solid var(--vy-line-0, #E2E5DC);
}

.vy-dashboard .btn { font-family: var(--vy-font-display, 'Barlow', sans-serif); }
`;

const statusColors = {
  scheduled: "primary",
  confirmed: "info",
  arrived: "warning",
  in_consultation: "secondary",
  completed: "success",
  checked_out: "dark",
  cancelled: "danger",
  no_show: "danger",
};

const formatCurrency = (n) => {
  if (n == null) return "₹0";
  return `₹${Number(n).toLocaleString("en-IN")}`;
};

const formatDate = (d) => {
  if (!d) return "-";
  const dt = new Date(d);
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
};

const Dashboard = () => {
  const { adminData } = useContext(AuthContext);
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? "Good morning" : currentHour < 17 ? "Good afternoon" : "Good evening";

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await getDashboardStats();
      if (res.data.isOk) {
        setStats(res.data.data);
      }
    } catch {
      // silently fail — widgets show 0
    }
    setLoading(false);
  };

  document.title = `Dashboard · ${adminData?.companyName}`;

  const todayAppts = stats?.todaysAppointments || { total: 0, byStatus: {} };
  const revenueThisMonth = stats?.revenueThisMonth || 0;
  const revenueLastMonth = stats?.revenueLastMonth || 0;
  const revChange = revenueLastMonth > 0
    ? (((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100).toFixed(1)
    : revenueThisMonth > 0 ? 100 : 0;

  const widgets = [
    {
      title: "Today's appointments",
      value: todayAppts.total,
      icon: "ri-calendar-check-line",
      accent: true,
      onClick: () => navigate("/appointments"),
    },
    {
      title: "Patients this month",
      value: stats?.patientsThisMonth || 0,
      icon: "ri-user-heart-line",
      onClick: () => navigate("/patients"),
    },
    {
      title: "Revenue this month",
      value: formatCurrency(revenueThisMonth),
      icon: "ri-money-rupee-circle-line",
      delta: revenueLastMonth > 0
        ? `${revChange >= 0 ? "▲ +" : "▼ "}${revChange}% vs last month`
        : null,
      deltaClass: revChange > 0 ? "up" : revChange < 0 ? "down" : "flat",
    },
    {
      title: "Pending payments",
      value: formatCurrency(stats?.pendingPayments?.totalAmount || 0),
      icon: "ri-bank-card-line",
      delta: `${stats?.pendingPayments?.count || 0} invoices`,
      deltaClass: "flat",
      onClick: () => navigate("/invoices"),
    },
  ];

  const smallWidgets = [
    {
      title: "Patients this week",
      value: stats?.patientsThisWeek || 0,
      icon: "ri-user-add-line",
    },
    {
      title: "Follow-ups pending",
      value: stats?.followUpsPending || 0,
      icon: "ri-phone-line",
      onClick: () => navigate("/appointments"),
    },
  ];

  return (
    <>
      <style>{dashboardStyles}</style>
      <div className="page-content vy-dashboard">
        <Container fluid>
          <BreadCrumb title="Dashboard" pageTitle="Dashboard" />

          <Row className="mb-4 align-items-end">
            <Col>
              <p className="vy-eyebrow mb-2">Overview</p>
              <h1 className="vy-greeting">
                {greeting},{" "}
                <span className="accent">
                  {adminData?.employeeName || adminData?.companyName}
                </span>
              </h1>
              <p className="vy-sub">Here's what's happening at your clinic today.</p>
            </Col>
            <Col xs="auto">
              <Button color="light" size="sm" onClick={fetchStats} disabled={loading}>
                <i className="ri-refresh-line me-1"></i>Refresh
              </Button>
            </Col>
          </Row>

          {loading ? (
            <div className="text-center py-5"><Spinner color="primary" /></div>
          ) : (
            <>
              <Row>
                {widgets.map((w, i) => (
                  <Col md={6} xl={3} key={i}>
                    <Card
                      className="card-animate"
                      style={{ cursor: w.onClick ? "pointer" : "default" }}
                      onClick={w.onClick}
                    >
                      <CardBody>
                        <div className="d-flex align-items-start justify-content-between">
                          <div className="flex-grow-1">
                            <p className="vy-eyebrow">{w.title}</p>
                            <h2 className="vy-metric-num">{w.value}</h2>
                            {w.delta && (
                              <p className={`vy-metric-delta ${w.deltaClass || ""}`}>{w.delta}</p>
                            )}
                          </div>
                          <div className={`vy-icon-square ${w.accent ? "accent" : ""}`}>
                            <i className={w.icon}></i>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  </Col>
                ))}
              </Row>

              <Row>
                {smallWidgets.map((w, i) => (
                  <Col md={3} key={i}>
                    <Card
                      className="card-animate"
                      style={{ cursor: w.onClick ? "pointer" : "default" }}
                      onClick={w.onClick}
                    >
                      <CardBody className="py-3">
                        <div className="d-flex align-items-center">
                          <div className="vy-icon-square me-3">
                            <i className={w.icon}></i>
                          </div>
                          <div>
                            <p className="vy-eyebrow mb-1" style={{ fontSize: 10 }}>{w.title}</p>
                            <h5 className="mb-0" style={{ fontFamily: "var(--vy-font-display)", fontWeight: 700, color: "var(--vy-ink)" }}>
                              {w.value}
                            </h5>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  </Col>
                ))}

                <Col md={3}>
                  <Card>
                    <CardBody className="py-3">
                      <div className="d-flex align-items-center">
                        <div className="vy-icon-square me-3">
                          <i className="ri-exchange-line"></i>
                        </div>
                        <div>
                          <p className="vy-eyebrow mb-1" style={{ fontSize: 10 }}>Last month revenue</p>
                          <h5 className="mb-0" style={{ fontFamily: "var(--vy-font-display)", fontWeight: 700, color: "var(--vy-ink)" }}>
                            {formatCurrency(revenueLastMonth)}
                          </h5>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                </Col>

                <Col md={3}>
                  <Card>
                    <CardBody className="py-3">
                      <p className="vy-eyebrow mb-2" style={{ fontSize: 10 }}>Quick actions</p>
                      <div className="d-flex gap-2 flex-wrap">
                        <Button color="primary" size="sm" onClick={() => navigate("/appointments/add")}>
                          <i className="ri-add-line me-1"></i>Appointment
                        </Button>
                        <Button color="light" size="sm" onClick={() => navigate("/patients/new")}>
                          <i className="ri-user-add-line me-1"></i>Patient
                        </Button>
                      </div>
                    </CardBody>
                  </Card>
                </Col>
              </Row>

              <Row>
                <Col xl={8}>
                  <Card>
                    <CardHeader className="d-flex justify-content-between align-items-center">
                      <h6 className="card-title">
                        <i className="ri-calendar-line me-2"></i>Today's appointments
                      </h6>
                      <Button color="light" size="sm" onClick={() => navigate("/appointments")}>
                        View schedule
                      </Button>
                    </CardHeader>
                    <CardBody>
                      {todayAppts.total === 0 ? (
                        <div className="text-center text-muted py-4">
                          <i className="ri-calendar-line" style={{ fontSize: "40px", opacity: 0.3 }}></i>
                          <p className="mt-2 mb-0">No appointments scheduled for today.</p>
                        </div>
                      ) : (
                        <Row>
                          {Object.entries(todayAppts.byStatus || {}).map(([status, count]) => {
                            if (count === 0) return null;
                            return (
                              <Col xs={6} sm={4} md={3} key={status} className="mb-3">
                                <div className="d-flex align-items-center gap-2">
                                  <Badge color={statusColors[status] || "secondary"} className="text-capitalize" style={{ fontSize: "10px", minWidth: "80px" }}>
                                    {status.replace(/_/g, " ")}
                                  </Badge>
                                  <span className="fw-semibold" style={{ fontFamily: "var(--vy-font-mono)", color: "var(--vy-ink)" }}>{count}</span>
                                </div>
                              </Col>
                            );
                          })}
                        </Row>
                      )}
                    </CardBody>
                  </Card>
                </Col>

                <Col xl={4}>
                  <Card>
                    <CardHeader>
                      <h6 className="card-title">
                        <i className="ri-cake-2-line me-2"></i>Upcoming birthdays · 7d
                      </h6>
                    </CardHeader>
                    <CardBody style={{ maxHeight: "280px", overflowY: "auto" }}>
                      {!stats?.upcomingBirthdays || stats.upcomingBirthdays.length === 0 ? (
                        <div className="text-center text-muted py-3">
                          <i className="ri-cake-2-line" style={{ fontSize: "32px", opacity: 0.3 }}></i>
                          <p className="mt-2 mb-0">No upcoming birthdays.</p>
                        </div>
                      ) : (
                        <div className="vstack gap-3">
                          {stats.upcomingBirthdays.map((p, i) => (
                            <div key={i} className="d-flex align-items-center">
                              <div className="vy-icon-square me-3">
                                <span style={{ fontWeight: 700 }}>{(p.firstName || "?")[0]}</span>
                              </div>
                              <div className="flex-grow-1">
                                <h6 className="mb-0" style={{ fontSize: "13px", color: "var(--vy-ink)" }}>
                                  {p.firstName} {p.lastName}
                                </h6>
                                <small className="text-muted">{p.mobileNumber}</small>
                              </div>
                              <Badge color="warning" style={{ fontSize: "10px" }}>
                                {formatDate(p.dateOfBirth)}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardBody>
                  </Card>
                </Col>
              </Row>
            </>
          )}
        </Container>
      </div>
    </>
  );
};

export default Dashboard;
