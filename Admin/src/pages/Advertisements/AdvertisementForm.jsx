import React, { useState, useEffect, useContext } from "react";
import {
  Card, CardBody, CardHeader, Col, Container, Row,
  Form, Input, Label, Button, Nav, NavItem, NavLink, TabContent, TabPane, Badge,
  Modal, ModalHeader, ModalBody, ModalFooter,
} from "reactstrap";
import classnames from "classnames";
import Select from "react-select";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  getAdvertisement, createAdvertisement, updateAdvertisement,
  updateAdvertisementStatus, uploadAdvertisementPdf,
} from "../../api/advertisements.api";
import { getAllDepartments } from "../../api/departments.api";
import { getAllQualifications } from "../../api/qualifications.api";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/AuthContext";
import { MenuContext } from "../../context/MenuContext";
import config from "../../config";

const CLASS_OPTIONS = [
  { value: "I", label: "Class I" }, { value: "II", label: "Class II" },
  { value: "III", label: "Class III" }, { value: "IV", label: "Class IV" },
];
const STATUS_TRANSITIONS = { Draft: ["Published"], Published: ["Closed"], Closed: ["Archived"], Archived: ["Published"] };
const statusColor = { Draft: "secondary", Published: "success", Closed: "warning", Archived: "dark" };

const empty = {
  post_title_en: "", post_title_gu: "", department: null, class: null, pay_scale: "",
  vacancies: "",
  start_date: "", end_date: "", application_fee: "", probation_period: "",
  age_min: "", age_max: "", qualification: "", experience_required: "",
  ph_description: "", other_conditions: "", note: "",
  required_qualifications: [],
  caste_certificate: { required: false, is_compulsory: false },
};

const AdvertisementForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { adminData } = useContext(AuthContext);
  const { currentPagePermissions } = useContext(MenuContext);

  const isEdit = !!id && location.pathname.endsWith("/edit");
  const isView = !!id && !location.pathname.endsWith("/edit");

  const [activeTab, setActiveTab] = useState("1");
  const [values, setValues] = useState(empty);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmit, setIsSubmit] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [deptOptions, setDeptOptions] = useState([]);
  const [record, setRecord] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [qualificationOptions, setQualificationOptions] = useState([]);
  // Status change is dropdown-driven and must be confirmed in a modal
  const [pendingStatus, setPendingStatus] = useState(null);

  useEffect(() => {
    getAllDepartments()
      .then((r) => setDeptOptions((r.data.data || []).map((d) => ({ value: d._id, label: d.departmentName }))))
      .catch(() => {});
    getAllQualifications({ isActive: true })
      .then((r) => setQualificationOptions((r.data.data || []).map((q) => ({ value: q._id, label: q.name }))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;
    setIsFetching(true);
    getAdvertisement(id)
      .then((r) => {
        const d = r.data.data;
        setRecord(d);
        setValues({
          post_title_en: d.post_title?.en || "",
          post_title_gu: d.post_title?.gu || "",
          department: d.department ? { value: d.department._id, label: d.department.departmentName } : null,
          class: d.class ? { value: d.class, label: `Class ${d.class}` } : null,
          pay_scale: d.pay_scale || "",
          vacancies:
            (typeof d.vacancies === "object" ? d.vacancies?.total : d.vacancies) ?? "",
          start_date:  d.start_date ? d.start_date.slice(0, 10) : "",
          end_date:    d.end_date   ? d.end_date.slice(0, 10)   : "",
          application_fee:     d.application_fee ?? "",
          probation_period:    d.probation_period || "",
          age_min:             d.age_limit?.min ?? "",
          age_max:             d.age_limit?.max ?? "",
          qualification:       d.qualification       || "",
          experience_required: d.experience_required || "",
          ph_description:      d.ph_description      || "",
          other_conditions:    d.other_conditions    || "",
          note:                d.note                || "",
          required_qualifications: (d.required_qualifications || []).map((rq) => ({
            qualification: rq.qualification?._id || rq.qualification,
            is_compulsory: rq.is_compulsory,
          })),
          caste_certificate: d.caste_certificate ?? { required: false, is_compulsory: false },
        });
      })
      .catch(() => toast.error("Failed to load advertisement"))
      .finally(() => setIsFetching(false));
  }, [id]);

  const set = (k, v) => setValues((prev) => ({ ...prev, [k]: v }));

  const validate = () => {
    const e = {};
    if (!values.post_title_en) e.post_title_en = "Post title (EN) is required";
    if (!values.department)    e.department    = "Department is required";
    if (!values.class)         e.class         = "Class is required";
    if (!values.end_date)      e.end_date      = "Last date is required";
    return e;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errors = validate();
    setFormErrors(errors);
    setIsSubmit(true);
    if (Object.keys(errors).length) return;

    const payload = {
      post_title: { en: values.post_title_en, gu: values.post_title_gu },
      department: values.department?.value,
      class: values.class?.value,
      pay_scale: values.pay_scale,
      vacancies: parseInt(values.vacancies) || 0,
      start_date:          values.start_date          || undefined,
      end_date:            values.end_date            || undefined,
      application_fee:     values.application_fee !== "" ? Number(values.application_fee) : undefined,
      probation_period:    values.probation_period    || undefined,
      age_limit:           { min: parseInt(values.age_min) || undefined, max: parseInt(values.age_max) || undefined },
      qualification:       values.qualification       || undefined,
      experience_required: values.experience_required || undefined,
      ph_description:      values.ph_description      || undefined,
      other_conditions:    values.other_conditions    || undefined,
      note:                values.note                || undefined,
      required_qualifications: values.required_qualifications,
      caste_certificate:       values.caste_certificate,
    };

    setIsLoading(true);
    const call = isEdit ? updateAdvertisement(id, payload) : createAdvertisement(payload);
    call
      .then((r) => {
        if (r.data.isOk) {
          toast.success(isEdit ? "Advertisement updated" : "Advertisement created");
          navigate("/advertisements");
        }
      })
      .catch(() => toast.error("Failed to save advertisement"))
      .finally(() => setIsLoading(false));
  };

  const handleStatusChange = (newStatus) => {
    setStatusLoading(true);
    updateAdvertisementStatus(id, newStatus)
      .then((r) => {
        if (r.data.isOk) {
          setRecord((p) => ({ ...p, status: r.data.data?.status ?? newStatus }));
          toast.success(`Status changed to ${r.data.data?.status ?? newStatus}`);
        } else {
          toast.error(r.data.message || "Status change failed");
        }
      })
      .catch((err) => toast.error(err?.response?.data?.message || "Status change failed"))
      .finally(() => {
        setStatusLoading(false);
        setPendingStatus(null);
      });
  };

  const statusOptions = record
    ? (STATUS_TRANSITIONS[record.status] ?? []).map((s) => ({ value: s, label: s }))
    : [];

  const handlePdfUpload = () => {
    if (!pdfFile) return;
    const fd = new FormData();
    fd.append("file", pdfFile);
    setPdfUploading(true);
    uploadAdvertisementPdf(id, fd)
      .then((r) => {
        toast.success("PDF uploaded");
        setPdfFile(null);
        if (r.data?.data?.pdf_path) {
          setRecord((p) => ({ ...p, pdf_path: r.data.data.pdf_path }));
        }
      })
      .catch(() => toast.error("PDF upload failed"))
      .finally(() => setPdfUploading(false));
  };

  const TABS = ["Basic Info", "Vacancies", "Dates & Fee", "Requirements", "PDF"];
  const title = isEdit ? "Edit Advertisement" : isView ? "View Advertisement" : "New Advertisement";
  document.title = `${title} | ${adminData?.companyName}`;

  if (isFetching) return <div className="page-content text-center py-5"><span className="spinner-border"></span></div>;

  return (
    <div className="page-content">
      <Container fluid>
        <BreadCrumb maintitle="Recruitment" title={title} pageTitle="Advertisements" />
        <Card>
          <CardHeader className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-3">
              <h5 className="mb-0">{title}</h5>
              {record && <Badge color={statusColor[record.status] || "secondary"}>{record.status}</Badge>}
            </div>
            <div className="d-flex gap-2 flex-wrap">
              {isView && currentPagePermissions.edit && (
                <Button color="success" size="sm" onClick={() => navigate(`/advertisements/${id}/edit`)}>
                  <i className="ri-edit-line me-1"></i>Edit
                </Button>
              )}
              {record && statusOptions.length > 0 && (
                <div style={{ minWidth: 180 }}>
                  <Select
                    options={statusOptions}
                    value={null}
                    placeholder="Change status..."
                    isDisabled={statusLoading}
                    onChange={(opt) => opt && setPendingStatus(opt.value)}
                  />
                </div>
              )}
            </div>
          </CardHeader>
          <CardBody>
            <Nav tabs className="mb-3">
              {TABS.map((label, i) => (
                <NavItem key={i}>
                  <NavLink className={classnames({ active: activeTab === String(i + 1) })} onClick={() => setActiveTab(String(i + 1))} style={{ cursor: "pointer" }}>
                    {label}
                  </NavLink>
                </NavItem>
              ))}
            </Nav>

            <Form onSubmit={handleSubmit}>
              <TabContent activeTab={activeTab}>
                <TabPane tabId="1">
                  <Row>
                    <Col md={6}>
                      <div className="mb-3">
                        <Label>Post Title (English) <span className="text-danger">*</span></Label>
                        <Input value={values.post_title_en} onChange={(e) => set("post_title_en", e.target.value)} disabled={isView} />
                        {isSubmit && formErrors.post_title_en && <p className="text-danger mt-1 mb-0" style={{fontSize:12}}>{formErrors.post_title_en}</p>}
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="mb-3">
                        <Label>Post Title (Gujarati)</Label>
                        <Input value={values.post_title_gu} onChange={(e) => set("post_title_gu", e.target.value)} disabled={isView} />
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="mb-3">
                        <Label>Department <span className="text-danger">*</span></Label>
                        <Select options={deptOptions} value={values.department} onChange={(v) => set("department", v)} isDisabled={isView} isSearchable placeholder="Select department..." />
                        {isSubmit && formErrors.department && <p className="text-danger mt-1 mb-0" style={{fontSize:12}}>{formErrors.department}</p>}
                      </div>
                    </Col>
                    <Col md={3}>
                      <div className="mb-3">
                        <Label>Class <span className="text-danger">*</span></Label>
                        <Select options={CLASS_OPTIONS} value={values.class} onChange={(v) => set("class", v)} isDisabled={isView} isSearchable placeholder="Select class..." />
                        {isSubmit && formErrors.class && <p className="text-danger mt-1 mb-0" style={{fontSize:12}}>{formErrors.class}</p>}
                      </div>
                    </Col>
                    <Col md={3}>
                      <div className="mb-3">
                        <Label>Pay Scale</Label>
                        <Input value={values.pay_scale} onChange={(e) => set("pay_scale", e.target.value)} disabled={isView} />
                      </div>
                    </Col>
                  </Row>
                </TabPane>

                <TabPane tabId="2">
                  <Row>
                    <Col md={3}>
                      <div className="mb-3">
                        <Label>Total Vacancies</Label>
                        <Input
                          type="number"
                          min={0}
                          value={values.vacancies}
                          onChange={(e) => set("vacancies", e.target.value)}
                          disabled={isView}
                        />
                      </div>
                    </Col>
                  </Row>
                </TabPane>

                <TabPane tabId="3">
                  <Row>
                    <Col md={3}>
                      <div className="mb-3"><Label>Start Date</Label><Input type="date" value={values.start_date} onChange={(e) => set("start_date", e.target.value)} disabled={isView} /></div>
                    </Col>
                    <Col md={3}>
                      <div className="mb-3">
                        <Label>Last Date <span className="text-danger">*</span></Label>
                        <Input type="date" value={values.end_date} onChange={(e) => set("end_date", e.target.value)} disabled={isView} />
                        {isSubmit && formErrors.end_date && <p className="text-danger mt-1 mb-0" style={{fontSize:12}}>{formErrors.end_date}</p>}
                      </div>
                    </Col>
                    <Col md={3}>
                      <div className="mb-3"><Label>Application Fee (₹)</Label><Input type="number" min={0} value={values.application_fee} onChange={(e) => set("application_fee", e.target.value)} disabled={isView} /></div>
                    </Col>
                    <Col md={3}>
                      <div className="mb-3"><Label>Probation Period</Label><Input value={values.probation_period} onChange={(e) => set("probation_period", e.target.value)} disabled={isView} /></div>
                    </Col>
                  </Row>
                </TabPane>

                <TabPane tabId="4">
                  <Row>
                    <Col md={2}><div className="mb-3"><Label>Min Age</Label><Input type="number" min={0} value={values.age_min} onChange={(e) => set("age_min", e.target.value)} disabled={isView} /></div></Col>
                    <Col md={2}><div className="mb-3"><Label>Max Age</Label><Input type="number" min={0} value={values.age_max} onChange={(e) => set("age_max", e.target.value)} disabled={isView} /></div></Col>
                    <Col md={4}><div className="mb-3"><Label>Qualification (Free Text)</Label><Input value={values.qualification} onChange={(e) => set("qualification", e.target.value)} disabled={isView} /></div></Col>
                    <Col md={4}><div className="mb-3"><Label>Experience Required</Label><Input value={values.experience_required} onChange={(e) => set("experience_required", e.target.value)} disabled={isView} /></div></Col>

                    {/* ── Required Qualifications (multi-select with compulsory toggle) ── */}
                    <Col md={12}>
                      <div className="mb-3">
                        <Label>Required Qualifications <span className="text-muted" style={{fontSize:12}}>(select one or more; toggle compulsory per item)</span></Label>
                        <Select
                          isMulti
                          options={qualificationOptions}
                          value={qualificationOptions.filter((opt) =>
                            values.required_qualifications.some((rq) => rq.qualification === opt.value)
                          )}
                          onChange={(selected) => {
                            const next = (selected || []).map((opt) => {
                              const existing = values.required_qualifications.find((rq) => rq.qualification === opt.value);
                              return { qualification: opt.value, is_compulsory: existing ? existing.is_compulsory : true };
                            });
                            set("required_qualifications", next);
                          }}
                          isDisabled={isView}
                          placeholder="Select required qualifications..."
                        />
                        {values.required_qualifications.length > 0 && (
                          <div className="mt-2 d-flex flex-wrap gap-2">
                            {values.required_qualifications.map((rq) => {
                              const opt = qualificationOptions.find((o) => o.value === rq.qualification);
                              return (
                                <div key={rq.qualification} className="d-flex align-items-center gap-1 border rounded px-2 py-1" style={{fontSize:13, background:"#f8f9fa"}}>
                                  <span>{opt?.label || rq.qualification}</span>
                                  <div className="form-check form-switch mb-0 ms-2">
                                    <Input
                                      type="checkbox"
                                      className="form-check-input"
                                      role="switch"
                                      checked={rq.is_compulsory}
                                      disabled={isView}
                                      onChange={(e) => {
                                        const next = values.required_qualifications.map((r) =>
                                          r.qualification === rq.qualification ? { ...r, is_compulsory: e.target.checked } : r
                                        );
                                        set("required_qualifications", next);
                                      }}
                                    />
                                    <Label className="form-check-label mb-0" style={{fontSize:11, color: rq.is_compulsory ? "#0f5132" : "#6c757d"}}>
                                      {rq.is_compulsory ? "Compulsory" : "Optional"}
                                    </Label>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </Col>

                    {/* ── Caste Certificate ── */}
                    <Col md={12}>
                      <div className="mb-3">
                        <Label>Caste Certificate</Label>
                        <div className="d-flex align-items-center gap-4 mt-1">
                          <div className="form-check">
                            <Input
                              type="checkbox"
                              className="form-check-input"
                              id="caste_required"
                              checked={values.caste_certificate.required}
                              disabled={isView}
                              onChange={(e) => set("caste_certificate", { required: e.target.checked, is_compulsory: e.target.checked ? values.caste_certificate.is_compulsory : false })}
                            />
                            <Label className="form-check-label" htmlFor="caste_required">Include caste certificate requirement</Label>
                          </div>
                          {values.caste_certificate.required && (
                            <div className="form-check form-switch mb-0">
                              <Input
                                type="checkbox"
                                className="form-check-input"
                                role="switch"
                                id="caste_compulsory"
                                checked={values.caste_certificate.is_compulsory}
                                disabled={isView}
                                onChange={(e) => set("caste_certificate", { ...values.caste_certificate, is_compulsory: e.target.checked })}
                              />
                              <Label className="form-check-label" htmlFor="caste_compulsory" style={{color: values.caste_certificate.is_compulsory ? "#0f5132" : "#6c757d"}}>
                                {values.caste_certificate.is_compulsory ? "Compulsory" : "Optional"}
                              </Label>
                            </div>
                          )}
                        </div>
                      </div>
                    </Col>

                    <Col md={6}><div className="mb-3"><Label>PH Description</Label><Input type="textarea" rows={2} value={values.ph_description} onChange={(e) => set("ph_description", e.target.value)} disabled={isView} /></div></Col>
                    <Col md={6}><div className="mb-3"><Label>Other Conditions</Label><Input type="textarea" rows={2} value={values.other_conditions} onChange={(e) => set("other_conditions", e.target.value)} disabled={isView} /></div></Col>
                    <Col md={12}><div className="mb-3"><Label>Note <span className="text-muted" style={{fontSize:12}}>(shown on public website)</span></Label><Input type="textarea" rows={3} value={values.note} onChange={(e) => set("note", e.target.value)} disabled={isView} placeholder="e.g. Candidates must bring original documents at the time of interview." /></div></Col>
                  </Row>
                </TabPane>

                <TabPane tabId="5">
                  {record?.pdf_path && (
                    <div className="mb-3">
                      <a href={`${config.api.API_URL}/api/v1/advertisements/${id}/pdf`} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-primary">
                        <i className="ri-file-pdf-line me-1"></i>View Current PDF
                      </a>
                    </div>
                  )}
                  {id && (
                    <div className="d-flex gap-2 align-items-end">
                      <div>
                        <Label>Upload PDF</Label>
                        <Input type="file" accept=".pdf,application/pdf" onChange={(e) => setPdfFile(e.target.files[0])} />
                      </div>
                      <Button type="button" color="primary" onClick={handlePdfUpload} disabled={!pdfFile || pdfUploading}>
                        {pdfUploading && <span className="spinner-border spinner-border-sm me-1"></span>}Upload
                      </Button>
                    </div>
                  )}
                  {!id && <p className="text-muted">Create the advertisement first, then upload the PDF.</p>}
                </TabPane>
              </TabContent>

              {!isView ? (
                <div className="hstack gap-2 mt-4 pt-3 border-top">
                  <Button color="success" type="submit" disabled={isLoading}>
                    {isLoading && <span className="spinner-border spinner-border-sm me-1"></span>}
                    {isEdit ? "Update" : "Create"}
                  </Button>
                  <Button color="outline-danger" type="button" onClick={() => navigate("/advertisements")} disabled={isLoading}>Cancel</Button>
                </div>
              ) : (
                <div className="mt-4 pt-3 border-top">
                  <Button color="secondary" onClick={() => navigate("/advertisements")}>Back to List</Button>
                </div>
              )}
            </Form>
          </CardBody>
        </Card>
      </Container>

      {/* Status change confirmation */}
      <Modal isOpen={!!pendingStatus} toggle={() => !statusLoading && setPendingStatus(null)} centered>
        <ModalHeader toggle={() => !statusLoading && setPendingStatus(null)}>
          Confirm status change
        </ModalHeader>
        <ModalBody>
          Change advertisement <strong>{record?.advt_no}</strong> from{" "}
          <Badge color={statusColor[record?.status] || "secondary"}>{record?.status}</Badge> to{" "}
          <Badge color={statusColor[pendingStatus] || "secondary"}>{pendingStatus}</Badge>?
          {pendingStatus === "Published" && (
            <p className="text-muted mt-2 mb-0" style={{ fontSize: 13 }}>
              Publishing makes this advertisement visible on the public website and opens it for applications.
            </p>
          )}
          {pendingStatus === "Closed" && (
            <p className="text-muted mt-2 mb-0" style={{ fontSize: 13 }}>
              Closing stops new applications immediately.
            </p>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="light" onClick={() => setPendingStatus(null)} disabled={statusLoading}>
            Cancel
          </Button>
          <Button color="primary" onClick={() => handleStatusChange(pendingStatus)} disabled={statusLoading}>
            {statusLoading && <span className="spinner-border spinner-border-sm me-1"></span>}
            Confirm
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default AdvertisementForm;
