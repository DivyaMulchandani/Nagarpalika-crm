import React, { useState, useEffect, useContext } from "react";
import { Card, CardBody, CardHeader, Col, Container, Row, Button, Input, Label, Table, Badge } from "reactstrap";
import { useParams, useNavigate } from "react-router-dom";
import { getCallLetterSettings, patchCallLetter, uploadRollNumbers, previewCallLetterPdf } from "../../api/callLetters.api";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/AuthContext";

const CallLetterManage = () => {
  const { advtNo } = useParams();
  const navigate = useNavigate();
  const { adminData } = useContext(AuthContext);
  const decodedAdvtNo = decodeURIComponent(advtNo);

  const [enabled, setEnabled] = useState(false);
  const [availableFrom, setAvailableFrom] = useState("");
  const [examDate, setExamDate] = useState("");
  const [examTime, setExamTime] = useState("");
  const [venue, setVenue] = useState("");
  const [reportingInstructions, setReportingInstructions] = useState("");
  const [patchLoading, setPatchLoading] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadErrors, setUploadErrors] = useState([]);
  const [uploadResult, setUploadResult] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [rollNumberCount, setRollNumberCount] = useState(null);

  useEffect(() => {
    getCallLetterSettings(decodedAdvtNo).then((r) => {
      const { settings: s, rollNumberCount: count } = r.data.data || {};
      setRollNumberCount(count ?? 0);
      if (!s) return;
      if (s.available_from) setAvailableFrom(new Date(s.available_from).toISOString().slice(0, 16));
      if (s.exam_date)      setExamDate(new Date(s.exam_date).toISOString().slice(0, 10));
      if (s.exam_time)      setExamTime(s.exam_time);
      if (s.venue)          setVenue(s.venue);
      if (s.reporting_instructions) setReportingInstructions(s.reporting_instructions);
      if (s.enabled !== undefined)  setEnabled(!!s.enabled);
    }).catch(() => {});
  }, [decodedAdvtNo]);

  const handlePatch = () => {
    setPatchLoading(true);
    const payload = { enabled };
    if (availableFrom) payload.available_from = availableFrom;
    if (examDate) payload.exam_date = examDate;
    if (examTime) payload.exam_time = examTime;
    if (venue) payload.venue = venue;
    if (reportingInstructions) payload.reporting_instructions = reportingInstructions;
    patchCallLetter(decodedAdvtNo, payload)
      .then(() => toast.success("Settings updated"))
      .catch((err) => toast.error(err?.response?.data?.message || "Update failed"))
      .finally(() => setPatchLoading(false));
  };

  const handleCsvUpload = () => {
    if (!csvFile) return;
    const fd = new FormData();
    fd.append("file", csvFile);
    setUploadLoading(true);
    setUploadErrors([]);
    setUploadResult(null);
    uploadRollNumbers(decodedAdvtNo, fd)
      .then((r) => { setUploadResult(r.data.data); toast.success("Roll numbers uploaded"); setCsvFile(null); setRollNumberCount((c) => (c ?? 0) + (r.data.data?.upserted ?? 0)); })
      .catch((err) => {
        const errors = err?.response?.data?.errors || [];
        setUploadErrors(errors);
        if (!errors.length) toast.error("Upload failed");
      })
      .finally(() => setUploadLoading(false));
  };

  const handlePreview = () => {
    setPreviewLoading(true);
    const overrides = {};
    if (examDate)               overrides.exam_date               = examDate;
    if (examTime)               overrides.exam_time               = examTime;
    if (venue)                  overrides.venue                   = venue;
    if (reportingInstructions)  overrides.reporting_instructions  = reportingInstructions;
    previewCallLetterPdf(decodedAdvtNo, overrides)
      .then((r) => {
        const url = URL.createObjectURL(new Blob([r.data], { type: "application/pdf" }));
        window.open(url, "_blank");
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      })
      .catch(() => toast.error("Preview failed"))
      .finally(() => setPreviewLoading(false));
  };

  document.title = `Manage Call Letters — ${decodedAdvtNo} | ${adminData?.companyName}`;

  return (
    <div className="page-content">
      <Container fluid>
        <BreadCrumb maintitle="Recruitment" title={`Call Letters — ${decodedAdvtNo}`} pageTitle="Call Letters" />
        <Card className="mb-3">
          <CardHeader><h6 className="mb-0">1. Upload Roll Numbers (CSV)</h6></CardHeader>
          <CardBody>
            <p className="text-muted" style={{ fontSize: 13 }}>Format: <code>registration_id,roll_number</code> (header row optional)</p>
            <div className="d-flex gap-2 align-items-end">
              <Input type="file" accept=".csv,text/csv" onChange={(e) => setCsvFile(e.target.files[0])} style={{ maxWidth: 300 }} />
              <Button color="primary" onClick={handleCsvUpload} disabled={!csvFile || uploadLoading}>
                {uploadLoading && <span className="spinner-border spinner-border-sm me-1"></span>}Upload
              </Button>
            </div>
            {rollNumberCount !== null && (
              <p className="mt-2 mb-0 text-muted" style={{ fontSize: 13 }}>
                {rollNumberCount > 0
                  ? `✓ ${rollNumberCount} roll number${rollNumberCount !== 1 ? "s" : ""} currently uploaded`
                  : "No roll numbers uploaded yet"}
              </p>
            )}
            {uploadResult && <p className="mt-2 mb-0 text-success" style={{ fontSize: 13 }}>✓ Upserted: {uploadResult.upserted}, Modified: {uploadResult.modified}</p>}
            {uploadErrors.length > 0 && (
              <div className="mt-2">
                <p className="text-danger mb-1" style={{ fontSize: 13 }}>Validation errors:</p>
                <Table bordered size="sm" style={{ maxWidth: 500 }}>
                  <thead><tr><th>Row</th><th>Reg ID</th><th>Error</th></tr></thead>
                  <tbody>
                    {uploadErrors.map((e, i) => (
                      <tr key={i}><td>{e.row || "—"}</td><td style={{ fontFamily: "monospace" }}>{e.registration_id || "—"}</td><td className="text-danger">{e.error}</td></tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </CardBody>
        </Card>
        <Card className="mb-3">
          <CardHeader><h6 className="mb-0">2. Settings &amp; Enable</h6></CardHeader>
          <CardBody>
            <Row>
              <Col md={3}><div className="mb-3"><Label>Available From</Label><Input type="datetime-local" value={availableFrom} onChange={(e) => setAvailableFrom(e.target.value)} /></div></Col>
              <Col md={3}><div className="mb-3"><Label>Exam Date</Label><Input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} /></div></Col>
              <Col md={2}><div className="mb-3"><Label>Exam Time</Label><Input value={examTime} onChange={(e) => setExamTime(e.target.value)} placeholder="10:00 AM" /></div></Col>
              <Col md={4}><div className="mb-3"><Label>Venue</Label><Input value={venue} onChange={(e) => setVenue(e.target.value)} /></div></Col>
              <Col md={12}><div className="mb-3"><Label>Reporting Instructions</Label><Input type="textarea" rows={3} value={reportingInstructions} onChange={(e) => setReportingInstructions(e.target.value)} /></div></Col>
              <Col md={12}>
                <div className="mb-3 form-check">
                  <Input type="checkbox" className="form-check-input" id="enabledChk" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
                  <Label className="form-check-label" htmlFor="enabledChk">
                    Enable download for candidates <Badge color={enabled ? "success" : "secondary"} className="ms-1">{enabled ? "Enabled" : "Disabled"}</Badge>
                  </Label>
                </div>
              </Col>
            </Row>
            <div className="hstack gap-2">
              <Button color="success" onClick={handlePatch} disabled={patchLoading}>
                {patchLoading && <span className="spinner-border spinner-border-sm me-1"></span>}Save Settings
              </Button>
              <Button color="outline-primary" onClick={handlePreview} disabled={previewLoading}>
                {previewLoading
                  ? <span className="spinner-border spinner-border-sm me-1"></span>
                  : <i className="ri-file-pdf-line me-1"></i>}
                Preview PDF
              </Button>
            </div>
          </CardBody>
        </Card>
        <Button color="secondary" size="sm" onClick={() => navigate("/call-letters")}>Back to List</Button>
      </Container>
    </div>
  );
};

export default CallLetterManage;
