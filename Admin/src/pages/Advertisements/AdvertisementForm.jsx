import React, { useState, useEffect, useContext } from "react";
import {
  Card, CardBody, CardHeader, Col, Container, Row,
  Form, Input, Label, Button, Nav, NavItem, NavLink, TabContent, TabPane, Badge,
} from "reactstrap";
import classnames from "classnames";
import Select from "react-select";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  getAdvertisement, createAdvertisement, updateAdvertisement,
  uploadAdvertisementPdf,
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
const statusColor = { Draft: "secondary", Published: "success", Closed: "warning", Archived: "dark" };

// Age relaxation groups (same keys the server checks against the candidate).
const RELAX_GROUPS = [
  { key: "SC", label: "SC" },
  { key: "ST", label: "ST" },
  { key: "OBC", label: "SEBC / OBC" },
  { key: "EWS", label: "EWS" },
  { key: "Female", label: "Women" },
  { key: "PH", label: "Persons with disability (PH)" },
  { key: "ExServiceman", label: "Ex-servicemen" },
];
const emptyRelaxation = { enabled: false, years: {}, combine: "add", max_age_cap: "", notes: "" };

// The sentence candidates will read on the advertisement page.
const describeRelaxation = (r, maxAge) => {
  if (!r?.enabled) return "No age relaxation.";
  const parts = RELAX_GROUPS.filter((g) => Number(r.years[g.key]) > 0).map((g) => `${g.label}: ${r.years[g.key]} years`);
  if (!parts.length) return "Age relaxation is on, but no group has years set yet.";
  let text = `Upper age relaxed for — ${parts.join("; ")}.`;
  text += r.combine === "highest"
    ? " If a candidate is in more than one group, only the highest relaxation applies."
    : " If a candidate is in more than one group, the relaxations are added together.";
  if (Number(r.max_age_cap) > 0) text += ` Upper age after relaxation will not exceed ${r.max_age_cap} years.`;
  if (maxAge) text += ` (Base upper age: ${maxAge} years.)`;
  return text;
};

const TYPE_LABEL = { education: "Education", certificate: "Certificate", document: "Other document" };
const REQUIREMENTS = {
  education: [["compulsory", "Upload compulsory"], ["optional", "Upload optional"]],
  certificate: [["compulsory", "Upload compulsory"], ["optional", "Upload optional"], ["declaration", "Upload, or declare 'will obtain'"]],
  document: [["compulsory", "Upload compulsory"], ["optional", "Upload optional"]],
};

const defaultVacancies = {
  general: { general: 0, female: 0 },
  sc: { general: 0, female: 0 },
  st: { general: 0, female: 0 },
  sebc: { general: 0, female: 0 },
  ews: { general: 0, female: 0 },
  total: 0,
};

const parseVacancies = (v) => {
  if (!v) return defaultVacancies;
  if (typeof v === "object") {
    const toNum = (n) => {
      const num = Number(n);
      return Number.isFinite(num) && num >= 0 ? Math.floor(num) : 0;
    };
    const general = {
      general: toNum(v.general?.general),
      female: toNum(v.general?.female),
    };
    const sc = {
      general: toNum(v.sc?.general),
      female: toNum(v.sc?.female),
    };
    const st = {
      general: toNum(v.st?.general),
      female: toNum(v.st?.female),
    };
    const sebc = {
      general: toNum(v.sebc?.general),
      female: toNum(v.sebc?.female),
    };
    const ews = {
      general: toNum(v.ews?.general),
      female: toNum(v.ews?.female),
    };
    const sum =
      general.general +
      general.female +
      sc.general +
      sc.female +
      st.general +
      st.female +
      sebc.general +
      sebc.female +
      ews.general +
      ews.female;
    return {
      general,
      sc,
      st,
      sebc,
      ews,
      total: sum > 0 ? sum : toNum(v.total),
    };
  }
  const total = Number(v) || 0;
  return {
    general: { general: total, female: 0 },
    sc: { general: 0, female: 0 },
    st: { general: 0, female: 0 },
    sebc: { general: 0, female: 0 },
    ews: { general: 0, female: 0 },
    total,
  };
};

const empty = {
  post_title_en: "",
  post_title_gu: "",
  department: null,
  class: null,
  pay_scale: "",
  vacancies: defaultVacancies,
  enforce_reservation_rules: true,
  start_date: "",
  end_date: "",
  application_fee: "",
  application_fee_concessional: "",
  probation_period: "",
  age_min: "",
  age_max: "",
  qualification: "",
  experience_required: "",
  ph_description: "",
  other_conditions: "",
  note: "",
  required_qualifications: [],
  caste_certificate: { required: false, is_compulsory: false },
  min_education: "",
  age_relaxation: emptyRelaxation,
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
  const [qualificationOptions, setQualificationOptions] = useState([]);

  useEffect(() => {
    getAllDepartments()
      .then((r) =>
        setDeptOptions(
          (r.data.data || []).map((d) => ({
            value: d._id,
            label: d.departmentName,
          })),
        ),
      )
      .catch(() => {});
    getAllQualifications({ isActive: true })
      .then((r) =>
        setQualificationOptions(
          (r.data.data || []).map((q) => ({
            value: q._id,
            label: q.name,
            type: q.type || "education",
            level: q.level,
          })),
        ),
      )
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
          department: d.department
            ? {
                value: d.department._id,
                label: d.department.departmentName,
              }
            : null,
          class: d.class
            ? { value: d.class, label: `Class ${d.class}` }
            : null,
          pay_scale: d.pay_scale || "",
          vacancies: parseVacancies(d.vacancies),
          enforce_reservation_rules:
            d.enforce_reservation_rules !== undefined
              ? !!d.enforce_reservation_rules
              : true,
          start_date: d.start_date ? d.start_date.slice(0, 10) : "",
          end_date: d.end_date ? d.end_date.slice(0, 10) : "",
          application_fee: d.application_fee ?? "",
          application_fee_concessional: d.application_fee_concessional ?? "",
          probation_period: d.probation_period || "",
          age_min: d.age_limit?.min ?? "",
          age_max: d.age_limit?.max ?? "",
          qualification: d.qualification || "",
          experience_required: d.experience_required || "",
          ph_description: d.ph_description || "",
          other_conditions: d.other_conditions || "",
          note: d.note || "",
          required_qualifications: (
            d.required_qualifications || []
          ).map((rq) => ({
            qualification: rq.qualification?._id || rq.qualification,
            is_compulsory: rq.is_compulsory,
            requirement: rq.requirement || (rq.is_compulsory ? "compulsory" : "optional"),
            instruction: rq.instruction || "",
          })),
          min_education: d.min_education?._id || d.min_education || "",
          age_relaxation: d.age_relaxation
            ? {
                enabled: !!d.age_relaxation.enabled,
                years: Object.fromEntries((d.age_relaxation.rules || []).map((r) => [r.group, r.years])),
                combine: d.age_relaxation.combine || "add",
                max_age_cap: d.age_relaxation.max_age_cap ?? "",
                notes: d.age_relaxation.notes || "",
              }
            : emptyRelaxation,
          caste_certificate: d.caste_certificate ?? {
            required: false,
            is_compulsory: false,
          },
        });
      })
      .catch(() => toast.error("Failed to load advertisement"))
      .finally(() => setIsFetching(false));
  }, [id]);

  const set = (k, v) => setValues((prev) => ({ ...prev, [k]: v }));
  const setRelax = (patch) => setValues((prev) => ({ ...prev, age_relaxation: { ...prev.age_relaxation, ...patch } }));

  const educationOptions = qualificationOptions
    .filter((o) => o.type === "education")
    .sort((a, b) => (a.level ?? 999) - (b.level ?? 999) || a.label.localeCompare(b.label));
  const optionsOfType = (type) => qualificationOptions.filter((o) => o.type === type);
  const typeOf = (qid) => qualificationOptions.find((o) => o.value === qid)?.type || "education";

  // Replace the picked items of one type, keeping the other types' items.
  const setRequiredOfType = (type, selected) => {
    setValues((prev) => {
      const others = prev.required_qualifications.filter((rq) => typeOf(rq.qualification) !== type);
      const picked = (selected || []).map((opt) => {
        const existing = prev.required_qualifications.find((rq) => rq.qualification === opt.value);
        return existing || { qualification: opt.value, requirement: "compulsory", is_compulsory: true, instruction: "" };
      });
      return { ...prev, required_qualifications: [...others, ...picked] };
    });
  };
  const updateRequired = (qid, patch) =>
    setValues((prev) => ({
      ...prev,
      required_qualifications: prev.required_qualifications.map((rq) =>
        rq.qualification === qid
          ? { ...rq, ...patch, ...(patch.requirement ? { is_compulsory: patch.requirement === "compulsory" } : {}) }
          : rq,
      ),
    }));
  // Choosing the minimum education also asks for that certificate (compulsory).
  const setMinEducation = (qid) =>
    setValues((prev) => ({
      ...prev,
      min_education: qid,
      required_qualifications:
        qid && !prev.required_qualifications.some((rq) => rq.qualification === qid)
          ? [...prev.required_qualifications, { qualification: qid, requirement: "compulsory", is_compulsory: true, instruction: "" }]
          : prev.required_qualifications,
    }));

  const updateVacancyCell = (category, type, rawVal) => {
    const num = Math.max(0, parseInt(rawVal, 10) || 0);
    setValues((prev) => {
      const current = prev.vacancies || defaultVacancies;
      const updatedCat = {
        ...current[category],
        [type]: num,
      };
      const nextVacancies = {
        ...current,
        [category]: updatedCat,
      };
      const total =
        (nextVacancies.general?.general || 0) +
        (nextVacancies.general?.female || 0) +
        (nextVacancies.sc?.general || 0) +
        (nextVacancies.sc?.female || 0) +
        (nextVacancies.st?.general || 0) +
        (nextVacancies.st?.female || 0) +
        (nextVacancies.sebc?.general || 0) +
        (nextVacancies.sebc?.female || 0) +
        (nextVacancies.ews?.general || 0) +
        (nextVacancies.ews?.female || 0);
      nextVacancies.total = total;
      return { ...prev, vacancies: nextVacancies };
    });
  };

  const validate = () => {
    const e = {};
    if (!values.post_title_en)
      e.post_title_en = "Post title (EN) is required";
    if (!values.department) e.department = "Department is required";
    if (!values.class) e.class = "Class is required";
    if (!values.end_date) e.end_date = "Last date is required";
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
      vacancies: values.vacancies,
      enforce_reservation_rules: values.enforce_reservation_rules,
      start_date: values.start_date || undefined,
      end_date: values.end_date || undefined,
      application_fee:
        values.application_fee !== ""
          ? Number(values.application_fee)
          : undefined,
      // Left blank => single-fee advertisement; everyone pays application_fee.
      application_fee_concessional:
        values.application_fee_concessional !== ""
          ? Number(values.application_fee_concessional)
          : undefined,
      probation_period: values.probation_period || undefined,
      age_limit: {
        min: parseInt(values.age_min) || undefined,
        max: parseInt(values.age_max) || undefined,
      },
      qualification: values.qualification || undefined,
      experience_required: values.experience_required || undefined,
      ph_description: values.ph_description || undefined,
      other_conditions: values.other_conditions || undefined,
      note: values.note || undefined,
      required_qualifications: values.required_qualifications.map((rq) => ({
        qualification: rq.qualification,
        requirement: rq.requirement || (rq.is_compulsory ? "compulsory" : "optional"),
        is_compulsory: (rq.requirement || (rq.is_compulsory ? "compulsory" : "optional")) === "compulsory",
        instruction: rq.instruction?.trim() || undefined,
      })),
      caste_certificate: values.caste_certificate,
      min_education: values.min_education || null,
      age_relaxation: {
        enabled: values.age_relaxation.enabled,
        rules: RELAX_GROUPS.filter((g) => Number(values.age_relaxation.years[g.key]) > 0).map((g) => ({
          group: g.key,
          years: Number(values.age_relaxation.years[g.key]),
        })),
        combine: values.age_relaxation.combine,
        max_age_cap: values.age_relaxation.max_age_cap !== "" ? Number(values.age_relaxation.max_age_cap) : undefined,
        notes: values.age_relaxation.notes || undefined,
      },
    };

    setIsLoading(true);
    const call = isEdit
      ? updateAdvertisement(id, payload)
      : createAdvertisement(payload);
    call
      .then(() => {
        toast.success(
          isEdit ? "Advertisement updated" : "Advertisement created",
        );
        navigate("/advertisements");
      })
      .catch((err) =>
        toast.error(
          err.response?.data?.message || "Failed to save advertisement",
        ),
      )
      .finally(() => setIsLoading(false));
  };

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
        <BreadCrumb maintitle="Recruitment" title={title} pageTitle="Advertisements" pageTitlePath="/advertisements" />
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
                  <div className="mb-4">
                    <h5 className="font-size-14 fw-semibold text-dark mb-3">Category-Wise Vacancy Matrix</h5>

                    <div className="table-responsive">
                      <table className="table table-bordered text-center align-middle mb-3" style={{ maxWidth: 950 }}>
                        <thead className="table-light">
                          <tr>
                            <th colSpan="2" style={{ backgroundColor: "#eef2f7" }}>General (GEN)</th>
                            <th colSpan="2" style={{ backgroundColor: "#eef2f7" }}>Scheduled Caste (SC)</th>
                            <th colSpan="2" style={{ backgroundColor: "#eef2f7" }}>Scheduled Tribe (ST)</th>
                            <th colSpan="2" style={{ backgroundColor: "#eef2f7" }}>SEBC / OBC</th>
                            <th colSpan="2" style={{ backgroundColor: "#eef2f7" }}>EWS</th>
                            <th rowSpan="2" className="text-dark align-middle" style={{ minWidth: 100, backgroundColor: "#e2e8f0" }}>
                              Total Vacancies
                            </th>
                          </tr>
                          <tr style={{ fontSize: 12 }}>
                            <th>General</th>
                            <th>Female</th>
                            <th>General</th>
                            <th>Female</th>
                            <th>General</th>
                            <th>Female</th>
                            <th>General</th>
                            <th>Female</th>
                            <th>General</th>
                            <th>Female</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>
                              <Input
                                type="number"
                                min={0}
                                className="text-center"
                                value={values.vacancies?.general?.general ?? 0}
                                onChange={(e) => updateVacancyCell("general", "general", e.target.value)}
                                disabled={isView}
                              />
                            </td>
                            <td>
                              <Input
                                type="number"
                                min={0}
                                className="text-center"
                                value={values.vacancies?.general?.female ?? 0}
                                onChange={(e) => updateVacancyCell("general", "female", e.target.value)}
                                disabled={isView}
                              />
                            </td>
                            <td>
                              <Input
                                type="number"
                                min={0}
                                className="text-center"
                                value={values.vacancies?.sc?.general ?? 0}
                                onChange={(e) => updateVacancyCell("sc", "general", e.target.value)}
                                disabled={isView}
                              />
                            </td>
                            <td>
                              <Input
                                type="number"
                                min={0}
                                className="text-center"
                                value={values.vacancies?.sc?.female ?? 0}
                                onChange={(e) => updateVacancyCell("sc", "female", e.target.value)}
                                disabled={isView}
                              />
                            </td>
                            <td>
                              <Input
                                type="number"
                                min={0}
                                className="text-center"
                                value={values.vacancies?.st?.general ?? 0}
                                onChange={(e) => updateVacancyCell("st", "general", e.target.value)}
                                disabled={isView}
                              />
                            </td>
                            <td>
                              <Input
                                type="number"
                                min={0}
                                className="text-center"
                                value={values.vacancies?.st?.female ?? 0}
                                onChange={(e) => updateVacancyCell("st", "female", e.target.value)}
                                disabled={isView}
                              />
                            </td>
                            <td>
                              <Input
                                type="number"
                                min={0}
                                className="text-center"
                                value={values.vacancies?.sebc?.general ?? 0}
                                onChange={(e) => updateVacancyCell("sebc", "general", e.target.value)}
                                disabled={isView}
                              />
                            </td>
                            <td>
                              <Input
                                type="number"
                                min={0}
                                className="text-center"
                                value={values.vacancies?.sebc?.female ?? 0}
                                onChange={(e) => updateVacancyCell("sebc", "female", e.target.value)}
                                disabled={isView}
                              />
                            </td>
                            <td>
                              <Input
                                type="number"
                                min={0}
                                className="text-center"
                                value={values.vacancies?.ews?.general ?? 0}
                                onChange={(e) => updateVacancyCell("ews", "general", e.target.value)}
                                disabled={isView}
                              />
                            </td>
                            <td>
                              <Input
                                type="number"
                                min={0}
                                className="text-center"
                                value={values.vacancies?.ews?.female ?? 0}
                                onChange={(e) => updateVacancyCell("ews", "female", e.target.value)}
                                disabled={isView}
                              />
                            </td>
                            <td className="fw-bold fs-5 text-dark bg-light">
                              {values.vacancies?.total ?? 0}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="card border p-3 mt-4" style={{ maxWidth: 950, backgroundColor: "#f8fafc" }}>
                      <div className="form-check form-switch form-switch-md">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="enforceReservationRules"
                          checked={values.enforce_reservation_rules}
                          onChange={(e) => set("enforce_reservation_rules", e.target.checked)}
                          disabled={isView}
                        />
                        <label className="form-check-label fw-bold text-dark ms-2" htmlFor="enforceReservationRules">
                          Enforce Category & Gender Eligibility Rules
                        </label>
                      </div>
                    </div>
                  </div>
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
                      <div className="mb-3"><Label>Application Fee — General Male (₹)</Label><Input type="number" min={0} value={values.application_fee} onChange={(e) => set("application_fee", e.target.value)} disabled={isView} /></div>
                    </Col>
                    <Col md={3}>
                      <div className="mb-3">
                        <Label>Concessional Fee (₹)</Label>
                        <Input type="number" min={0} value={values.application_fee_concessional} onChange={(e) => set("application_fee_concessional", e.target.value)} disabled={isView} />
                        <small className="text-muted">Reserved categories and all non-male candidates. Leave blank to charge everyone the same fee.</small>
                      </div>
                    </Col>
                    <Col md={3}>
                      <div className="mb-3"><Label>Probation Period</Label><Input value={values.probation_period} onChange={(e) => set("probation_period", e.target.value)} disabled={isView} /></div>
                    </Col>
                  </Row>
                </TabPane>

                <TabPane tabId="4">
                  <Row>
                    {/* ── Age ── */}
                    <Col md={12}><h6 className="mb-2">Age</h6></Col>
                    <Col md={2}><div className="mb-3"><Label>Min Age</Label><Input type="number" min={0} value={values.age_min} onChange={(e) => set("age_min", e.target.value)} disabled={isView} /></div></Col>
                    <Col md={2}><div className="mb-3"><Label>Max Age</Label><Input type="number" min={0} value={values.age_max} onChange={(e) => set("age_max", e.target.value)} disabled={isView} /></div></Col>
                    <Col md={8}>
                      <div className="mb-3 small text-muted" style={{ paddingTop: 30 }}>
                        Age is counted in completed years <strong>as on the last date of application</strong>
                        {values.end_date ? ` (${values.end_date.split("-").reverse().join("-")})` : ""}. Candidates outside the limits cannot apply.
                      </div>
                    </Col>

                    <Col md={12}>
                      <div className="border rounded p-3 mb-3" style={{ background: "#fafbf8" }}>
                        <div className="form-check form-switch mb-2">
                          <Input type="checkbox" className="form-check-input" role="switch" id="relax_on"
                            checked={values.age_relaxation.enabled} disabled={isView}
                            onChange={(e) => setRelax({ enabled: e.target.checked })} />
                          <Label className="form-check-label fw-semibold" htmlFor="relax_on">Age relaxation applicable for this post</Label>
                        </div>
                        {values.age_relaxation.enabled && (
                          <>
                            <div className="small text-muted mb-2">Enter the years of relaxation in the <strong>upper</strong> age for each group, as given by the authority. Leave blank for groups with no relaxation.</div>
                            <Row className="g-2 mb-2">
                              {RELAX_GROUPS.map((g) => (
                                <Col md={3} sm={6} key={g.key}>
                                  <div className="input-group input-group-sm">
                                    <span className="input-group-text" style={{ minWidth: 150 }}>{g.label}</span>
                                    <Input type="number" min={0} max={30} placeholder="0"
                                      value={values.age_relaxation.years[g.key] ?? ""} disabled={isView}
                                      onChange={(e) => setRelax({ years: { ...values.age_relaxation.years, [g.key]: e.target.value } })} />
                                    <span className="input-group-text">yrs</span>
                                  </div>
                                </Col>
                              ))}
                            </Row>
                            <Row className="g-3 align-items-end">
                              <Col md={5}>
                                <Label className="mb-1 small">If a candidate is in more than one group</Label>
                                <div className="d-flex gap-3">
                                  {[["add", "Add the relaxations together"], ["highest", "Only the highest applies"]].map(([v, l]) => (
                                    <div className="form-check" key={v}>
                                      <Input type="radio" className="form-check-input" id={`comb_${v}`} name="relax_combine"
                                        checked={values.age_relaxation.combine === v} disabled={isView}
                                        onChange={() => setRelax({ combine: v })} />
                                      <Label className="form-check-label small" htmlFor={`comb_${v}`}>{l}</Label>
                                    </div>
                                  ))}
                                </div>
                              </Col>
                              <Col md={3}>
                                <Label className="mb-1 small">Max age after relaxation (optional)</Label>
                                <Input type="number" min={0} bsSize="sm" placeholder="e.g. 45" value={values.age_relaxation.max_age_cap} disabled={isView}
                                  onChange={(e) => setRelax({ max_age_cap: e.target.value })} />
                              </Col>
                              <Col md={4}>
                                <Label className="mb-1 small">Other relaxation rules (shown to candidates)</Label>
                                <Input type="textarea" rows={1} bsSize="sm" value={values.age_relaxation.notes} disabled={isView}
                                  placeholder="e.g. Govt. employees: as per GAD rules"
                                  onChange={(e) => setRelax({ notes: e.target.value })} />
                              </Col>
                            </Row>
                          </>
                        )}
                        <div className="mt-2 small" style={{ color: "#145c2e" }}>
                          <i className="ri-eye-line me-1"></i><strong>Candidates will see:</strong> {describeRelaxation(values.age_relaxation, values.age_max)}
                          {values.age_relaxation.enabled && values.age_relaxation.notes ? ` ${values.age_relaxation.notes}` : ""}
                        </div>
                      </div>
                    </Col>

                    {/* ── Education ── */}
                    <Col md={12}><h6 className="mb-2 mt-1">Education</h6></Col>
                    <Col md={4}>
                      <div className="mb-3">
                        <Label>Minimum Education <span className="text-danger">*</span></Label>
                        <Select
                          options={educationOptions.map((o) => ({ ...o, label: `${o.label}${typeof o.level === "number" ? ` (level ${o.level})` : " (no level set)"}` }))}
                          value={(() => { const o = educationOptions.find((x) => x.value === values.min_education); return o ? { ...o, label: `${o.label}${typeof o.level === "number" ? ` (level ${o.level})` : " (no level set)"}` } : null; })()}
                          onChange={(opt) => setMinEducation(opt?.value || "")}
                          isClearable isDisabled={isView} placeholder="Select minimum education…"
                        />
                        <small className="text-muted">Candidates whose highest qualification is below this level cannot apply. Required before publishing.</small>
                      </div>
                    </Col>
                    <Col md={4}><div className="mb-3"><Label>Qualification Details <span className="text-muted" style={{fontSize:12}}>(shown to candidates)</span></Label><Input value={values.qualification} onChange={(e) => set("qualification", e.target.value)} disabled={isView} placeholder="e.g. B.E. Civil from a recognised university" /></div></Col>
                    <Col md={4}><div className="mb-3"><Label>Experience Required</Label><Input value={values.experience_required} onChange={(e) => set("experience_required", e.target.value)} disabled={isView} /></div></Col>

                    {/* ── Documents & certificates ── */}
                    <Col md={12}><h6 className="mb-2 mt-1">Documents &amp; Certificates <span className="text-muted fw-normal" style={{fontSize:12}}>(asked for on the apply page)</span></h6></Col>
                    {["education", "certificate", "document"].map((type) => (
                      <Col md={4} key={type}>
                        <div className="mb-3">
                          <Label className="mb-1">{type === "education" ? "Education certificates" : type === "certificate" ? "Certificates (CCC, typing…)" : "Other documents"}</Label>
                          <Select
                            isMulti
                            options={optionsOfType(type)}
                            value={optionsOfType(type).filter((opt) => values.required_qualifications.some((rq) => rq.qualification === opt.value))}
                            onChange={(selected) => setRequiredOfType(type, selected)}
                            isDisabled={isView}
                            placeholder={optionsOfType(type).length ? "Select…" : "None in master yet"}
                          />
                        </div>
                      </Col>
                    ))}
                    {values.required_qualifications.length > 0 && (
                      <Col md={12}>
                        <div className="table-responsive mb-3">
                          <table className="table table-sm table-bordered align-middle mb-0" style={{ fontSize: 13 }}>
                            <thead className="table-light">
                              <tr><th>Document</th><th style={{ width: 130 }}>Type</th><th style={{ width: 260 }}>Requirement</th><th>Instruction to candidate (optional)</th></tr>
                            </thead>
                            <tbody>
                              {values.required_qualifications.map((rq) => {
                                const opt = qualificationOptions.find((o) => o.value === rq.qualification);
                                const type = opt?.type || "education";
                                const req = rq.requirement || (rq.is_compulsory ? "compulsory" : "optional");
                                return (
                                  <tr key={rq.qualification}>
                                    <td>{opt?.label || rq.qualification}{rq.qualification === values.min_education && <Badge color="info" className="ms-2">Minimum education</Badge>}</td>
                                    <td>{TYPE_LABEL[type]}</td>
                                    <td>
                                      <Input type="select" bsSize="sm" value={req} disabled={isView}
                                        onChange={(e) => updateRequired(rq.qualification, { requirement: e.target.value })}>
                                        {REQUIREMENTS[type].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                                      </Input>
                                    </td>
                                    <td>
                                      <Input bsSize="sm" value={rq.instruction || ""} disabled={isView} maxLength={300}
                                        placeholder={type === "certificate" ? "e.g. CCC from NIELIT / govt-approved institute; may be passed within probation" : ""}
                                        onChange={(e) => updateRequired(rq.qualification, { instruction: e.target.value })} />
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </Col>
                    )}

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
    </div>
  );
};

export default AdvertisementForm;
