import React, { useState, useEffect, useContext } from "react";
import {
  Container, Row, Col, Card, CardBody, CardHeader,
  Badge, Spinner, Button,
} from "reactstrap";
import { useNavigate } from "react-router-dom";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import { AuthContext } from "../../context/AuthContext";
import { getDashboardStats } from "../../api/analytics.api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
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

const fmt = (n) => Number(n ?? 0).toLocaleString("en-IN");
const fmtRs = (n) => `₹${fmt(n)}`;

const Dashboard = () => {
  const { adminData } = useContext(AuthContext);
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await getDashboardStats();
      if (res.data.isOk) setStats(res.data.data);
    } catch { /* widgets show 0 */ }
    setLoading(false);
  };

  useEffect(() => { fetchStats(); }, []);

  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? "Good morning" : currentHour < 17 ? "Good afternoon" : "Good evening";

  document.title = `Dashboard · ${adminData?.companyName}`;

  const adv  = stats?.advertisements  || {};
  const appl = stats?.applications    || {};
  const fee  = stats?.feePayments     || {};
  const totalApps = (appl.submitted || 0) + (appl.under_review || 0) + (appl.shortlisted || 0) + (appl.rejected || 0) + (appl.selected || 0);

  const widgets = [
    { title: "Active Advertisements",     value: fmt(adv.published),               icon: "ri-newspaper-line",         accent: true,  onClick: () => navigate("/advertisements") },
    { title: "Registered Candidates",     value: fmt(stats?.candidates?.total),     icon: "ri-user-search-line",                      onClick: () => navigate("/candidates") },
    { title: "Applications Submitted",    value: fmt(totalApps),                    icon: "ri-file-list-3-line",                      onClick: () => navigate("/applications") },
    { title: "Fees Collected",            value: fmtRs(fee.paid?.amount),           icon: "ri-money-rupee-circle-line",               onClick: () => navigate("/fee-payments") },
  ];

  const appStatusColors = ["#4A90D9", "#F5A623", "#7ED321", "#D0021B", "#417505"];
  const barData = [
    { name: "Submitted",    value: appl.submitted    || 0 },
    { name: "Under Review", value: appl.under_review || 0 },
    { name: "Shortlisted",  value: appl.shortlisted  || 0 },
    { name: "Rejected",     value: appl.rejected     || 0 },
    { name: "Selected",     value: appl.selected     || 0 },
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
                <span className="accent">{adminData?.employeeName || adminData?.companyName}</span>
              </h1>
              <p className="vy-sub">Recruitment portal at a glance.</p>
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
              <Row className="mb-3">
                {widgets.map((w, i) => (
                  <Col md={6} xl={3} key={i}>
                    <Card className="card-animate" style={{ cursor: w.onClick ? "pointer" : "default" }} onClick={w.onClick}>
                      <CardBody>
                        <div className="d-flex align-items-start justify-content-between">
                          <div className="flex-grow-1">
                            <p className="vy-eyebrow">{w.title}</p>
                            <h2 className="vy-metric-num">{w.value}</h2>
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
                <Col xl={7}>
                  <Card>
                    <CardHeader className="d-flex justify-content-between align-items-center">
                      <h6 className="card-title"><i className="ri-bar-chart-2-line me-2"></i>Applications by Status</h6>
                      <Button color="light" size="sm" onClick={() => navigate("/applications")}>View All</Button>
                    </CardHeader>
                    <CardBody>
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={barData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                            {barData.map((_, i) => <Cell key={i} fill={appStatusColors[i % appStatusColors.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardBody>
                  </Card>
                </Col>

                <Col xl={5}>
                  <Card className="mb-3">
                    <CardHeader><h6 className="card-title"><i className="ri-file-text-line me-2"></i>Advertisements</h6></CardHeader>
                    <CardBody>
                      <div className="d-flex flex-wrap gap-3">
                        {[["Draft", adv.draft, "secondary"], ["Published", adv.published, "success"], ["Closed", adv.closed, "warning"], ["Archived", adv.archived, "dark"]].map(([label, count, color]) => (
                          <div key={label} className="text-center" style={{ minWidth: 60 }}>
                            <Badge color={color} style={{ fontSize: 13, padding: "6px 10px" }}>{fmt(count)}</Badge>
                            <div style={{ fontSize: 10, marginTop: 4, color: "#888" }}>{label}</div>
                          </div>
                        ))}
                      </div>
                    </CardBody>
                  </Card>

                  <Card>
                    <CardHeader><h6 className="card-title"><i className="ri-bank-card-line me-2"></i>Fee Payments</h6></CardHeader>
                    <CardBody>
                      <div className="d-flex flex-wrap gap-3">
                        {[
                          ["Paid", fee.paid?.count, fmtRs(fee.paid?.amount), "success"],
                          ["Pending", fee.pending?.count, `${fmt(fee.pending?.count)} txns`, "warning"],
                          ["Failed", fee.failed?.count, `${fmt(fee.failed?.count)} txns`, "danger"],
                        ].map(([label, count, sub, color]) => (
                          <div key={label} className="border rounded p-2 text-center" style={{ minWidth: 90 }}>
                            <Badge color={color} className="mb-1">{label}</Badge>
                            <div style={{ fontWeight: 700, fontSize: 16 }}>{fmt(count)}</div>
                            <div style={{ fontSize: 10, color: "#888" }}>{sub}</div>
                          </div>
                        ))}
                      </div>
                    </CardBody>
                  </Card>
                </Col>
              </Row>

              <Row>
                <Col>
                  <Card>
                    <CardBody className="py-3">
                      <p className="vy-eyebrow mb-2" style={{ fontSize: 10 }}>Quick actions</p>
                      <div className="d-flex gap-2 flex-wrap">
                        <Button color="primary" size="sm" onClick={() => navigate("/advertisements/new")}>
                          <i className="ri-add-line me-1"></i>New Advertisement
                        </Button>
                        <Button color="light" size="sm" onClick={() => navigate("/notices/new")}>
                          <i className="ri-notification-3-line me-1"></i>New Notice
                        </Button>
                        <Button color="light" size="sm" onClick={() => navigate("/call-letters")}>
                          <i className="ri-mail-send-line me-1"></i>Call Letters
                        </Button>
                        <Button color="light" size="sm" onClick={() => navigate("/fee-payments/reconciliation")}>
                          <i className="ri-pie-chart-line me-1"></i>Reconciliation
                        </Button>
                      </div>
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
