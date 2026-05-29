import React, { useState, useEffect, useContext } from "react";
import {
  Container, Row, Col, Card, CardBody, CardHeader,
  Badge, Button, Input, Label, Spinner,
  Modal, ModalHeader, ModalBody, ModalFooter,
  Nav, NavItem, NavLink, TabContent, TabPane,
  FormGroup, Alert,
} from "reactstrap";
import DataTable from "react-data-table-component";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import { AuthContext } from "../../context/AuthContext";
import { MenuContext } from "../../context/MenuContext";
import {
  searchWhatsAppMessages,
  getWhatsAppStats,
  sendCustomWhatsApp,
  retryFailedWhatsApp,
  getWhatsAppConfig,
  updateWhatsAppConfig,
  testWhatsAppConnection,
} from "../../api/whatsapp.api";
import { toast } from "react-toastify";
import classnames from "classnames";

const statusColors = {
  queued: "secondary",
  sent: "info",
  delivered: "primary",
  read: "success",
  failed: "danger",
};

const triggerLabels = {
  appointment_reminder: "Appointment Reminder",
  payment_confirmation: "Payment Confirmation",
  follow_up_reminder: "Follow-Up Reminder",
  birthday_wish: "Birthday Wish",
  anniversary_wish: "Anniversary Wish",
  no_show_follow_up: "No-Show Follow-Up",
  custom: "Custom Message",
  bulk_broadcast: "Broadcast",
};

const formatDate = (d) => {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
};

const WhatsAppMessages = () => {
  const { adminData } = useContext(AuthContext);
  const { currentPagePermissions } = useContext(MenuContext);
  const [activeTab, setActiveTab] = useState("messages");

  // ==================== MESSAGES TAB STATE ====================
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(50);
  const [pageNo, setPageNo] = useState(0);
  const [triggerFilter, setTriggerFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [query, setQuery] = useState("");
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendForm, setSendForm] = useState({ patientId: "", messageBody: "", templateName: "" });
  const [sending, setSending] = useState(false);

  // ==================== SETTINGS TAB STATE ====================
  const [config, setConfig] = useState(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  const [newAccessToken, setNewAccessToken] = useState("");
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  // ==================== EFFECTS ====================
  useEffect(() => {
    if (activeTab === "messages") {
      fetchStats();
      fetchMessages();
    } else if (activeTab === "settings") {
      fetchConfig();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "messages") fetchMessages();
  }, [pageNo, perPage, triggerFilter, statusFilter, dateFrom, dateTo, query]);

  // ==================== MESSAGES HANDLERS ====================
  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const res = await getWhatsAppStats();
      if (res.data.isOk) setStats(res.data.data);
    } catch { /* ignore */ }
    setStatsLoading(false);
  };

  const fetchMessages = async () => {
    setLoading(true);
    let skip = (pageNo - 1) * perPage;
    if (skip < 0) skip = 0;
    try {
      const params = { skip, per_page: perPage };
      if (triggerFilter) params.triggerType = triggerFilter;
      if (statusFilter) params.deliveryStatus = statusFilter;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      if (query) params.match = query;
      const res = await searchWhatsAppMessages(params);
      if (res.data.data && res.data.data.length > 0) {
        setData(res.data.data[0].data || []);
        setTotalRows(res.data.data[0].count || 0);
      } else {
        setData([]);
        setTotalRows(0);
      }
    } catch {
      setData([]);
    }
    setLoading(false);
  };

  const handleRetryFailed = async () => {
    try {
      const res = await retryFailedWhatsApp();
      if (res.data.isOk) {
        toast.success(res.data.message);
        fetchMessages();
        fetchStats();
      } else {
        toast.error(res.data.message);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to retry messages");
    }
  };

  const handleSendCustom = async () => {
    if (!sendForm.patientId) { toast.error("Patient ID is required"); return; }
    setSending(true);
    try {
      const res = await sendCustomWhatsApp(sendForm);
      if (res.data.isOk) {
        toast.success(res.data.message);
        setShowSendModal(false);
        setSendForm({ patientId: "", messageBody: "", templateName: "" });
        fetchMessages();
        fetchStats();
      } else {
        toast.error(res.data.message);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to send message");
    }
    setSending(false);
  };

  // ==================== SETTINGS HANDLERS ====================
  const fetchConfig = async () => {
    setConfigLoading(true);
    try {
      const res = await getWhatsAppConfig();
      if (res.data.isOk) {
        setConfig(res.data.data);
        setNewAccessToken(""); // reset token field
        setTestResult(null);
      }
    } catch (err) {
      toast.error("Failed to load WhatsApp configuration");
    }
    setConfigLoading(false);
  };

  const handleSaveConfig = async () => {
    setConfigSaving(true);
    try {
      const payload = { ...config };
      // Only send new token if user typed one
      if (newAccessToken.trim()) {
        payload.accessToken = newAccessToken.trim();
      }
      // Remove fields we don't want to send back
      delete payload._id;
      delete payload.__v;
      delete payload.createdAt;
      delete payload.updatedAt;
      delete payload.accessTokenMasked;
      delete payload.hasAccessToken;
      delete payload.updatedBy;

      const res = await updateWhatsAppConfig(payload);
      if (res.data.isOk) {
        toast.success(res.data.message);
        fetchConfig(); // reload to get masked token
      } else {
        toast.error(res.data.message);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save configuration");
    }
    setConfigSaving(false);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testWhatsAppConnection();
      if (res.data.isOk) {
        setTestResult(res.data.data);
      }
    } catch (err) {
      setTestResult({ connected: false, error: "Network error" });
    }
    setTesting(false);
  };

  const updateConfigField = (field, value) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const updateTrigger = (trigger, value) => {
    setConfig((prev) => ({
      ...prev,
      triggers: { ...prev.triggers, [trigger]: value },
    }));
  };

  const updateTemplate = (trigger, value) => {
    setConfig((prev) => ({
      ...prev,
      templates: { ...prev.templates, [trigger]: value },
    }));
  };

  // ==================== TABLE COLUMNS ====================
  const columns = [
    { name: "Date", selector: (row) => formatDate(row.createdAt), maxWidth: "170px", sortable: true },
    {
      name: "Recipient",
      selector: (row) => (
        <div>
          <div className="fw-semibold" style={{ fontSize: "12px" }}>{row.recipientName || "-"}</div>
          <small className="text-muted">{row.recipientPhone}</small>
        </div>
      ),
      minWidth: "150px",
    },
    {
      name: "Type",
      selector: (row) => (
        <Badge color="soft-primary" className="text-capitalize" style={{ fontSize: "10px" }}>
          {triggerLabels[row.triggerType] || row.triggerType}
        </Badge>
      ),
      maxWidth: "170px",
    },
    {
      name: "Message",
      selector: (row) => (
        <span className="text-truncate d-inline-block" style={{ maxWidth: "250px", fontSize: "12px" }}>
          {row.messageBody || row.templateName || "-"}
        </span>
      ),
      minWidth: "200px",
    },
    {
      name: "Status",
      selector: (row) => (
        <Badge color={statusColors[row.deliveryStatus] || "secondary"} className="text-capitalize">
          {row.deliveryStatus}
        </Badge>
      ),
      maxWidth: "110px",
    },
    { name: "Delivered", selector: (row) => row.deliveredAt ? formatDate(row.deliveredAt) : "-", maxWidth: "150px" },
    { name: "Read", selector: (row) => row.readAt ? formatDate(row.readAt) : "-", maxWidth: "150px" },
  ];

  const statWidgets = [
    { label: "Total", value: stats?.total || 0, color: "primary" },
    { label: "Sent", value: stats?.byStatus?.sent || 0, color: "info" },
    { label: "Delivered", value: stats?.byStatus?.delivered || 0, color: "primary" },
    { label: "Read", value: stats?.byStatus?.read || 0, color: "success" },
    { label: "Failed", value: stats?.byStatus?.failed || 0, color: "danger" },
    { label: "Queued", value: stats?.byStatus?.queued || 0, color: "secondary" },
  ];

  document.title = `WhatsApp | ${adminData?.companyName}`;

  // ==================== RENDER ====================
  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <BreadCrumb maintitle="WhatsApp" title="WhatsApp" pageTitle="WhatsApp" />

          <Card>
            <CardHeader className="p-0 border-bottom">
              <Nav className="nav-tabs nav-tabs-custom" role="tablist">
                <NavItem>
                  <NavLink className={classnames({ active: activeTab === "messages" })} onClick={() => setActiveTab("messages")} href="#">
                    <i className="ri-message-2-line me-1"></i>Messages
                  </NavLink>
                </NavItem>
                <NavItem>
                  <NavLink className={classnames({ active: activeTab === "settings" })} onClick={() => setActiveTab("settings")} href="#">
                    <i className="ri-settings-3-line me-1"></i>Configuration
                  </NavLink>
                </NavItem>
              </Nav>
            </CardHeader>

            <CardBody className="p-0">
              <TabContent activeTab={activeTab}>
                {/* ==================== MESSAGES TAB ==================== */}
                <TabPane tabId="messages" className="p-3">
                  {/* Stats */}
                  <Row className="mb-3 g-3">
                    {statWidgets.map((w, i) => (
                      <Col key={i} xs={6} md={2}>
                        <Card className="mb-0 border">
                          <CardBody className="py-2 px-3 text-center">
                            <p className="text-muted mb-0" style={{ fontSize: "11px" }}>{w.label}</p>
                            <h5 className={`mb-0 text-${w.color}`}>{statsLoading ? "..." : w.value}</h5>
                          </CardBody>
                        </Card>
                      </Col>
                    ))}
                  </Row>

                  {/* Filters */}
                  <Card className="mb-3 border">
                    <CardBody className="py-2">
                      <Row className="align-items-end g-2">
                        <Col md={2}>
                          <Label className="form-label mb-1" style={{ fontSize: "11px" }}>Type</Label>
                          <Input type="select" bsSize="sm" value={triggerFilter} onChange={(e) => setTriggerFilter(e.target.value)}>
                            <option value="">All</option>
                            {Object.entries(triggerLabels).map(([k, v]) => (
                              <option key={k} value={k}>{v}</option>
                            ))}
                          </Input>
                        </Col>
                        <Col md={2}>
                          <Label className="form-label mb-1" style={{ fontSize: "11px" }}>Status</Label>
                          <Input type="select" bsSize="sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                            <option value="">All</option>
                            {Object.keys(statusColors).map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </Input>
                        </Col>
                        <Col md={2}>
                          <Label className="form-label mb-1" style={{ fontSize: "11px" }}>From</Label>
                          <Input type="date" bsSize="sm" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                        </Col>
                        <Col md={2}>
                          <Label className="form-label mb-1" style={{ fontSize: "11px" }}>To</Label>
                          <Input type="date" bsSize="sm" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                        </Col>
                        <Col md={2}>
                          <Input type="text" bsSize="sm" placeholder="Search..." value={query} onChange={(e) => setQuery(e.target.value)} />
                        </Col>
                        <Col md={2} className="d-flex gap-2">
                          {currentPagePermissions.write && (
                            <Button color="success" size="sm" onClick={() => setShowSendModal(true)}>
                              <i className="ri-send-plane-line me-1"></i>Send
                            </Button>
                          )}
                          {currentPagePermissions.edit && (
                            <Button color="soft-warning" size="sm" onClick={handleRetryFailed} title="Retry failed messages">
                              <i className="ri-refresh-line me-1"></i>Retry
                            </Button>
                          )}
                        </Col>
                      </Row>
                    </CardBody>
                  </Card>

                  {/* Messages Table */}
                  <DataTable
                    columns={columns}
                    data={data}
                    progressPending={loading}
                    pagination
                    paginationServer
                    paginationTotalRows={totalRows}
                    paginationPerPage={50}
                    paginationRowsPerPageOptions={[25, 50, 100]}
                    onChangeRowsPerPage={(n) => setPerPage(n)}
                    onChangePage={(p) => setPageNo(p)}
                  />
                </TabPane>

                {/* ==================== SETTINGS TAB ==================== */}
                <TabPane tabId="settings" className="p-3">
                  {configLoading ? (
                    <div className="text-center py-5"><Spinner color="primary" /></div>
                  ) : !config ? (
                    <div className="text-center text-muted py-5">Failed to load configuration</div>
                  ) : (
                    <>
                      {/* Connection Status */}
                      {testResult && (
                        <Alert color={testResult.connected ? "success" : "danger"} className="mb-3">
                          {testResult.connected ? (
                            <div>
                              <i className="ri-checkbox-circle-line me-1"></i>
                              <strong>Connected!</strong> Phone: {testResult.phoneNumber} | Name: {testResult.verifiedName}
                              {testResult.qualityRating && <> | Quality: {testResult.qualityRating}</>}
                            </div>
                          ) : (
                            <div>
                              <i className="ri-error-warning-line me-1"></i>
                              <strong>Connection Failed:</strong> {testResult.error}
                            </div>
                          )}
                        </Alert>
                      )}

                      <Row>
                        {/* Left Column — API Credentials */}
                        <Col lg={6}>
                          <Card className="border">
                            <CardHeader className="py-2">
                              <h6 className="card-title mb-0">
                                <i className="ri-key-2-line me-2 text-warning"></i>API Credentials
                              </h6>
                            </CardHeader>
                            <CardBody>
                              <FormGroup className="mb-3">
                                <div className="d-flex align-items-center justify-content-between mb-1">
                                  <Label className="form-label mb-0">WhatsApp Enabled</Label>
                                  <div className="form-check form-switch">
                                    <Input
                                      type="switch"
                                      role="switch"
                                      checked={config.isEnabled || false}
                                      onChange={(e) => updateConfigField("isEnabled", e.target.checked)}
                                    />
                                  </div>
                                </div>
                                <small className="text-muted">Master switch — when off, no messages are sent</small>
                              </FormGroup>

                              <FormGroup className="mb-3">
                                <Label className="form-label">API URL</Label>
                                <Input
                                  bsSize="sm"
                                  value={config.apiUrl || ""}
                                  onChange={(e) => updateConfigField("apiUrl", e.target.value)}
                                  placeholder="https://graph.facebook.com/v21.0"
                                />
                              </FormGroup>

                              <FormGroup className="mb-3">
                                <Label className="form-label">Phone Number ID *</Label>
                                <Input
                                  bsSize="sm"
                                  value={config.phoneNumberId || ""}
                                  onChange={(e) => updateConfigField("phoneNumberId", e.target.value)}
                                  placeholder="e.g. 123456789012345"
                                />
                                <small className="text-muted">From Meta Business Manager → WhatsApp → API Setup</small>
                              </FormGroup>

                              <FormGroup className="mb-3">
                                <Label className="form-label">Business Account ID</Label>
                                <Input
                                  bsSize="sm"
                                  value={config.businessAccountId || ""}
                                  onChange={(e) => updateConfigField("businessAccountId", e.target.value)}
                                  placeholder="e.g. 987654321098765"
                                />
                              </FormGroup>

                              <FormGroup className="mb-3">
                                <Label className="form-label">Access Token *</Label>
                                {config.hasAccessToken && (
                                  <div className="mb-1">
                                    <small className="text-muted">
                                      Current: <code>{config.accessTokenMasked}</code>
                                    </small>
                                  </div>
                                )}
                                <Input
                                  bsSize="sm"
                                  type="password"
                                  value={newAccessToken}
                                  onChange={(e) => setNewAccessToken(e.target.value)}
                                  placeholder={config.hasAccessToken ? "Leave blank to keep current token" : "Paste permanent access token"}
                                />
                                <small className="text-muted">Permanent token from Meta App Dashboard → System Users</small>
                              </FormGroup>

                              <FormGroup className="mb-3">
                                <Label className="form-label">Webhook Verify Token</Label>
                                <Input
                                  bsSize="sm"
                                  value={config.webhookVerifyToken || ""}
                                  onChange={(e) => updateConfigField("webhookVerifyToken", e.target.value)}
                                  placeholder="hms-whatsapp-verify"
                                />
                                <small className="text-muted">Must match the token in Meta webhook configuration</small>
                              </FormGroup>

                              <FormGroup className="mb-0">
                                <Label className="form-label">Default Country Code</Label>
                                <Input
                                  bsSize="sm"
                                  value={config.defaultCountryCode || "91"}
                                  onChange={(e) => updateConfigField("defaultCountryCode", e.target.value)}
                                  placeholder="91"
                                  style={{ width: "100px" }}
                                />
                              </FormGroup>
                            </CardBody>
                          </Card>

                          {/* Retry Settings */}
                          <Card className="border">
                            <CardHeader className="py-2">
                              <h6 className="card-title mb-0">
                                <i className="ri-refresh-line me-2 text-info"></i>Retry Settings
                              </h6>
                            </CardHeader>
                            <CardBody>
                              <Row>
                                <Col md={6}>
                                  <FormGroup>
                                    <Label className="form-label">Max Retries</Label>
                                    <Input
                                      bsSize="sm"
                                      type="number"
                                      min={0}
                                      max={10}
                                      value={config.maxRetries ?? 3}
                                      onChange={(e) => updateConfigField("maxRetries", Number(e.target.value))}
                                    />
                                  </FormGroup>
                                </Col>
                                <Col md={6}>
                                  <FormGroup>
                                    <Label className="form-label">Backoff (min)</Label>
                                    <Input
                                      bsSize="sm"
                                      type="number"
                                      min={1}
                                      max={60}
                                      value={config.retryBackoffMinutes ?? 1}
                                      onChange={(e) => updateConfigField("retryBackoffMinutes", Number(e.target.value))}
                                    />
                                    <small className="text-muted">Exponential: 1, 2, 4, 8... × this value</small>
                                  </FormGroup>
                                </Col>
                              </Row>
                              <FormGroup className="mb-0">
                                <Label className="form-label">Template Language</Label>
                                <Input
                                  bsSize="sm"
                                  value={config.templateLanguage || "en"}
                                  onChange={(e) => updateConfigField("templateLanguage", e.target.value)}
                                  style={{ width: "100px" }}
                                />
                              </FormGroup>
                            </CardBody>
                          </Card>
                        </Col>

                        {/* Right Column — Triggers & Templates */}
                        <Col lg={6}>
                          <Card className="border">
                            <CardHeader className="py-2">
                              <h6 className="card-title mb-0">
                                <i className="ri-flashlight-line me-2 text-success"></i>Automated Triggers
                              </h6>
                            </CardHeader>
                            <CardBody>
                              <small className="text-muted d-block mb-3">Toggle which automated messages are sent. Each trigger uses a Meta-approved template.</small>

                              {[
                                { key: "appointmentReminder", label: "Appointment Reminder", desc: "Sent before scheduled appointments" },
                                { key: "paymentConfirmation", label: "Payment Confirmation", desc: "Sent after each payment is recorded" },
                                { key: "followUpReminder", label: "Follow-Up Reminder", desc: "Sent when follow-up appointment is confirmed" },
                                { key: "birthdayWish", label: "Birthday Wish", desc: "Sent on patient's birthday" },
                                { key: "anniversaryWish", label: "Anniversary Wish", desc: "Sent on patient's wedding anniversary" },
                                { key: "noShowFollowUp", label: "No-Show Follow-Up", desc: "Sent when patient is marked as no-show" },
                              ].map(({ key, label, desc }) => (
                                <div key={key} className="border-bottom pb-3 mb-3">
                                  <div className="d-flex align-items-center justify-content-between mb-1">
                                    <div>
                                      <span className="fw-semibold" style={{ fontSize: "13px" }}>{label}</span>
                                      <br />
                                      <small className="text-muted">{desc}</small>
                                    </div>
                                    <div className="form-check form-switch">
                                      <Input
                                        type="switch"
                                        role="switch"
                                        checked={config.triggers?.[key] ?? false}
                                        onChange={(e) => updateTrigger(key, e.target.checked)}
                                      />
                                    </div>
                                  </div>
                                  <div className="mt-2">
                                    <Label className="form-label mb-0" style={{ fontSize: "11px" }}>Template Name</Label>
                                    <Input
                                      bsSize="sm"
                                      value={config.templates?.[key] || ""}
                                      onChange={(e) => updateTemplate(key, e.target.value)}
                                      placeholder={`e.g. ${key.replace(/([A-Z])/g, "_$1").toLowerCase()}`}
                                    />
                                  </div>
                                </div>
                              ))}

                              {/* Reminder timing */}
                              <FormGroup className="mb-0">
                                <Label className="form-label">Reminder Hours Before Appointment</Label>
                                <Input
                                  bsSize="sm"
                                  value={(config.reminderHoursBefore || []).join(", ")}
                                  onChange={(e) => {
                                    const vals = e.target.value
                                      .split(",")
                                      .map((v) => Number(v.trim()))
                                      .filter((v) => !isNaN(v) && v > 0);
                                    updateConfigField("reminderHoursBefore", vals);
                                  }}
                                  placeholder="24, 2"
                                />
                                <small className="text-muted">Comma-separated hours (e.g. 24, 2 = 24h and 2h before)</small>
                              </FormGroup>
                            </CardBody>
                          </Card>
                        </Col>
                      </Row>

                      {/* Action Buttons */}
                      <div className="d-flex gap-2 justify-content-end mt-2">
                        <Button color="soft-info" onClick={handleTestConnection} disabled={testing}>
                          {testing ? <Spinner size="sm" className="me-1" /> : <i className="ri-wifi-line me-1"></i>}
                          Test Connection
                        </Button>
                        <Button color="primary" onClick={handleSaveConfig} disabled={configSaving}>
                          {configSaving ? <Spinner size="sm" className="me-1" /> : <i className="ri-save-line me-1"></i>}
                          Save Configuration
                        </Button>
                      </div>
                    </>
                  )}
                </TabPane>
              </TabContent>
            </CardBody>
          </Card>
        </Container>
      </div>

      {/* Send Custom Message Modal */}
      <Modal isOpen={showSendModal} toggle={() => setShowSendModal(false)}>
        <ModalHeader toggle={() => setShowSendModal(false)}>Send WhatsApp Message</ModalHeader>
        <ModalBody>
          <div className="mb-3">
            <Label className="form-label">Patient ID *</Label>
            <Input
              value={sendForm.patientId}
              onChange={(e) => setSendForm({ ...sendForm, patientId: e.target.value })}
              placeholder="Enter patient MongoDB ID"
            />
          </div>
          <div className="mb-3">
            <Label className="form-label">Template Name</Label>
            <Input
              value={sendForm.templateName}
              onChange={(e) => setSendForm({ ...sendForm, templateName: e.target.value })}
              placeholder="Meta-approved template name"
            />
          </div>
          <div className="mb-3">
            <Label className="form-label">Message Preview</Label>
            <Input
              type="textarea"
              rows={3}
              value={sendForm.messageBody}
              onChange={(e) => setSendForm({ ...sendForm, messageBody: e.target.value })}
              placeholder="Message content (for logging)"
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setShowSendModal(false)}>Cancel</Button>
          <Button color="success" onClick={handleSendCustom} disabled={sending}>
            {sending ? <Spinner size="sm" className="me-1" /> : <i className="ri-send-plane-line me-1"></i>}
            Send
          </Button>
        </ModalFooter>
      </Modal>
    </React.Fragment>
  );
};

export default WhatsAppMessages;
