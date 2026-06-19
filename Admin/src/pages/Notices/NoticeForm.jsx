import React, { useState, useEffect, useRef, useContext } from "react";
import { Card, CardBody, CardHeader, Col, Container, Row, Button, Input, Label, FormFeedback } from "reactstrap";
import Select from "react-select";
import { useParams, useNavigate } from "react-router-dom";
import JoditEditor from "jodit-react";
import { getNoticeById, createNotice, updateNotice, uploadNoticePdf, updateNoticeStatus } from "../../api/notices.api";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/AuthContext";

const TYPE_OPTIONS = [
  { value: "general",     label: "General" },
  { value: "recruitment", label: "Recruitment" },
  { value: "tender",      label: "Tender" },
  { value: "result",      label: "Result" },
];

const STATUS_OPTIONS = [
  { value: "draft",       label: "Draft" },
  { value: "published",   label: "Published" },
  { value: "unpublished", label: "Unpublished" },
];

const EMPTY = { title: "", type: null, publish_date: "", expiry_date: "", is_important_instruction: false, body: "", status: "draft" };

const NoticeForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { adminData } = useContext(AuthContext);
  const isEdit = id && id !== "new";
  const editor = useRef(null);

  const [form, setForm]         = useState(EMPTY);
  const [errors, setErrors]     = useState({});
  const [saving, setSaving]     = useState(false);
  const [loadingInit, setLoadingInit] = useState(isEdit);
  const [pdfFile, setPdfFile]   = useState(null);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [savedId, setSavedId]   = useState(id || null);
  const [existingPdf, setExistingPdf] = useState(null);

  useEffect(() => {
    if (!isEdit) return;
    getNoticeById(id)
      .then((r) => {
        const n = r.data.data;
        setForm({
          title: n.title || "",
          type: TYPE_OPTIONS.find((o) => o.value === n.type) || null,
          publish_date: n.publish_date ? n.publish_date.slice(0, 10) : "",
          expiry_date:  n.expiry_date  ? n.expiry_date.slice(0, 10)  : "",
          is_important_instruction: !!n.is_important_instruction,
          body: n.body || "",
          status: n.status || "draft",
        });
        setExistingPdf(n.pdf_path || null);
        setSavedId(id);
      })
      .catch(() => toast.error("Failed to load notice"))
      .finally(() => setLoadingInit(false));
  }, [id, isEdit]);

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = "Title is required";
    if (!form.type) e.type = "Type is required";
    return e;
  };

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setSaving(true);
    const payload = {
      title: form.title,
      type: form.type?.value,
      publish_date: form.publish_date || undefined,
      expiry_date:  form.expiry_date  || undefined,
      is_important_instruction: form.is_important_instruction,
      body: form.body,
      status: form.status,
    };
    try {
      if (isEdit) {
        await updateNotice(savedId, payload);
        toast.success("Notice updated");
      } else {
        const res = await createNotice(payload);
        const newId = res.data.data?._id;
        setSavedId(newId);
        toast.success("Notice created");
      }
      navigate("/notices");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (next) => {
    if (!savedId) { toast.error("Save the notice first"); return; }
    try {
      await updateNoticeStatus(savedId, next);
      setForm((prev) => ({ ...prev, status: next }));
      toast.success(`Status changed to ${next}`);
    } catch { toast.error("Status update failed"); }
  };

  const handlePdfUpload = async () => {
    if (!pdfFile) return;
    if (!savedId) { toast.error("Save the notice first, then upload PDF"); return; }
    const fd = new FormData();
    fd.append("file", pdfFile);
    setPdfUploading(true);
    try {
      await uploadNoticePdf(savedId, fd);
      toast.success("PDF uploaded");
      setPdfFile(null);
    } catch { toast.error("PDF upload failed"); }
    setPdfUploading(false);
  };

  document.title = `${isEdit ? "Edit" : "New"} Notice | ${adminData?.companyName}`;

  if (loadingInit) return <div className="page-content text-center py-5"><span className="spinner-border"></span></div>;

  return (
    <div className="page-content">
      <Container fluid>
        <BreadCrumb maintitle="Recruitment" title={isEdit ? "Edit Notice" : "New Notice"} pageTitle="Notice Board" pageTitlePath="/notices" />

        <Card className="mb-3">
          <CardHeader className="d-flex align-items-center justify-content-between">
            <h6 className="mb-0">Notice Details</h6>
            <div className="d-flex gap-1">
              {form.status !== "published"   && <Button size="sm" color="success"   onClick={() => handleStatusChange("published")}>Publish</Button>}
              {form.status === "published"   && <Button size="sm" color="warning"   onClick={() => handleStatusChange("unpublished")}>Unpublish</Button>}
              {form.status !== "draft"       && <Button size="sm" color="secondary" onClick={() => handleStatusChange("draft")}>Revert to Draft</Button>}
            </div>
          </CardHeader>
          <CardBody>
            <Row>
              <Col md={8} className="mb-3">
                <Label>Title <span className="text-danger">*</span></Label>
                <Input value={form.title} onChange={set("title")} invalid={!!errors.title} />
                {errors.title && <FormFeedback>{errors.title}</FormFeedback>}
              </Col>
              <Col md={4} className="mb-3">
                <Label>Type <span className="text-danger">*</span></Label>
                <Select
                  options={TYPE_OPTIONS}
                  value={form.type}
                  onChange={(v) => setForm((p) => ({ ...p, type: v }))}
                  placeholder="Select type"
                  isClearable
                  isSearchable
                />
                {errors.type && <div className="text-danger mt-1" style={{ fontSize: 12 }}>{errors.type}</div>}
              </Col>
              <Col md={3} className="mb-3">
                <Label>Publish Date</Label>
                <Input type="date" value={form.publish_date} onChange={set("publish_date")} />
              </Col>
              <Col md={3} className="mb-3">
                <Label>Expiry Date</Label>
                <Input type="date" value={form.expiry_date} onChange={set("expiry_date")} />
              </Col>
              <Col md={3} className="mb-3">
                <Label>Status</Label>
                <Select
                  options={STATUS_OPTIONS}
                  value={STATUS_OPTIONS.find((o) => o.value === form.status) || null}
                  onChange={(v) => v && setForm((p) => ({ ...p, status: v.value }))}
                  isSearchable={false}
                />
              </Col>
              <Col md={3} className="mb-3 d-flex align-items-center">
                <div className="form-check mt-4">
                  <Input
                    type="checkbox"
                    className="form-check-input"
                    id="importantChk"
                    checked={form.is_important_instruction}
                    onChange={(e) => setForm((p) => ({ ...p, is_important_instruction: e.target.checked }))}
                  />
                  <Label className="form-check-label" htmlFor="importantChk">Mark as Important</Label>
                </div>
              </Col>
            </Row>

            <div className="mb-3">
              <Label>Body (Rich Text)</Label>
              <JoditEditor
                ref={editor}
                value={form.body}
                config={{ height: 350, readonly: false }}
                onBlur={(content) => setForm((p) => ({ ...p, body: content }))}
              />
            </div>

            <div className="hstack gap-2">
              <Button color="success" onClick={handleSave} disabled={saving}>
                {saving && <span className="spinner-border spinner-border-sm me-1"></span>}
                {isEdit ? "Update Notice" : "Create Notice"}
              </Button>
              <Button color="secondary" onClick={() => navigate("/notices")}>Cancel</Button>
            </div>
          </CardBody>
        </Card>

        {savedId && (
          <Card>
            <CardHeader><h6 className="mb-0">PDF Attachment</h6></CardHeader>
            <CardBody>
              {existingPdf && (
                <div className="mb-3 p-2 bg-light border rounded">
                  <div className="d-flex gap-2 align-items-center">
                    <i className="ri-file-pdf-line" style={{ fontSize: 20, color: "#d9534f" }}></i>
                    <div className="flex-grow-1">
                      <div className="small text-muted">Current PDF:</div>
                      <div className="text-truncate">{existingPdf}</div>
                    </div>
                    <Button size="sm" color="info" href={`/api/v1/notices/${savedId}/pdf`} target="_blank">
                      Download
                    </Button>
                  </div>
                </div>
              )}
              <div className="d-flex gap-2 align-items-end">
                <Input type="file" accept=".pdf,application/pdf" onChange={(e) => setPdfFile(e.target.files[0])} style={{ maxWidth: 300 }} />
                <Button color="primary" onClick={handlePdfUpload} disabled={!pdfFile || pdfUploading}>
                  {pdfUploading && <span className="spinner-border spinner-border-sm me-1"></span>}
                  {existingPdf ? "Replace PDF" : "Upload PDF"}
                </Button>
              </div>
            </CardBody>
          </Card>
        )}
      </Container>
    </div>
  );
};

export default NoticeForm;
