import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import StepIndicator from "./StepIndicator";
import { get, post } from "../../api/index";
import { transliterateToGujarati } from "../../utils/gujaratiTransliterate";

const API_BASE = import.meta.env.VITE_API_URL || "";

const TOTAL_STEPS = 10;
const CATEGORIES = ["General", "OBC", "SC", "ST", "EWS"];
const GENDERS = ["Male", "Female", "Other"];

function FieldError({ msg }) {
  return msg ? (
    <p style={{ color: "var(--ojas-red)", fontSize: 12, margin: "2px 0 0" }}>
      {msg}
    </p>
  ) : null;
}

export default function RegistrationStep() {
  const { step: stepStr } = useParams();
  const navigate = useNavigate();
  const step = Math.max(1, Math.min(parseInt(stepStr) || 1, TOTAL_STEPS));

  const [data, setData] = useState({});
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [registrationId, setRegId] = useState(null);
  const [sessionMissing, setSessionMissing] = useState(false);

  const photoRef = useRef();
  const sigRef = useRef();

  const set = (field) => (e) =>
    setData((p) => ({ ...p, [field]: e.target.value }));
  const go = (n) => navigate(`/registration/apply/step/${n}`);
  const back = (n) => go(n);

  // ── Session guard: steps 3+ require an active registration session ──
  useEffect(() => {
    if (step <= 2) return;
    get("/api/v1/candidates/register/resume")
      .then((res) => {
        // Restore any previously saved fields into local state
        if (res?.data?.data) setData((p) => ({ ...p, ...res.data.data }));
      })
      .catch(() => setSessionMissing(true));
  }, [step]);

  const saveStep = async (payload) => {
    setErrors({});
    setLoading(true);
    try {
      await post("/api/v1/candidates/register/step", { step, data: payload });
      go(step + 1);
    } catch (err) {
      if (err.message?.toLowerCase().includes("no registration"))
        setSessionMissing(true);
      else setErrors({ _: err.message || "Save failed. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (url, field, file, maxKB) => {
    if (!file) {
      setErrors({ [field]: "Please select a file." });
      return;
    }
    if (file.size > maxKB * 1024) {
      setErrors({ [field]: `File must be under ${maxKB} KB.` });
      return;
    }
    if (field === "photo" || field === "signature") {
      if (!["image/jpeg", "image/jpg", "image/png"].includes(file.type)) {
        setErrors({ [field]: "Only JPEG or PNG files are accepted." });
        return;
      }
    } else if (!file.type.startsWith("image/")) {
      setErrors({ [field]: "Only image files are accepted." });
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append(field, file);
      const res = await fetch(`${API_BASE}${url}`, {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.message || "Upload failed.");
      }
      go(step + 1);
    } catch (err) {
      if (err.message?.toLowerCase().includes("no registration"))
        setSessionMissing(true);
      else setErrors({ [field]: err.message || "Upload failed." });
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      /* ── Step 1: Instructions ── */
      case 1:
        return (
          <>
            <h2 style={{ fontSize: 16, marginBottom: 12 }}>
              Step 1: Instructions
            </h2>
            <div
              className="notice info"
              style={{ maxHeight: 300, overflowY: "auto", fontSize: 13 }}
            >
              <div className="title">Read Before Proceeding</div>
              <ol style={{ paddingLeft: 20, lineHeight: 1.9 }}>
                <li>
                  One Time Registration (OTR) is done once. Details cannot be
                  changed without a formal request.
                </li>
                <li>Keep your Aadhaar card, mobile number, and email ready.</li>
                <li>
                  Photo: JPEG/PNG, max 100 KB, white background, clear face.
                </li>
                <li>
                  Signature: JPEG only, max 20 KB, black/blue ink on white
                  paper.
                </li>
                <li>
                  OTR does <strong>NOT</strong> mean your application for any
                  post is accepted.
                </li>
              </ol>
              <p
                style={{
                  fontFamily: "var(--font-guj)",
                  fontSize: 12,
                  marginTop: 8,
                }}
              >
                OTR નો અર્થ એ નથી કે તમારી અરજી સ્વીકારાઈ ગઈ છે.
              </p>
            </div>
            <label
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                marginTop: 16,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={!!data.agreed}
                onChange={(e) =>
                  setData((p) => ({ ...p, agreed: e.target.checked }))
                }
              />
              <span style={{ fontSize: 13 }}>
                I have read and understood the above instructions.
              </span>
            </label>
            <div className="form-actions" style={{ marginTop: 12 }}>
              <button
                className="btn primary"
                disabled={!data.agreed}
                onClick={() => go(2)}
              >
                Proceed ▶
              </button>
            </div>
          </>
        );

      /* ── Step 2: Aadhaar + OTP ── */
      case 2:
        return (
          <>
            <h2 style={{ fontSize: 16, marginBottom: 12 }}>
              Step 2: Aadhaar Verification
            </h2>
            <div className="form-row">
              <div className="form-field">
                <label>Aadhaar Number *</label>
                <input
                  type="text"
                  maxLength={12}
                  value={data.aadhaar || ""}
                  onChange={set("aadhaar")}
                  placeholder="12-digit Aadhaar"
                />
                <FieldError msg={errors.aadhaar} />
              </div>
              <div className="form-field">
                <label>Mobile Number *</label>
                <input
                  type="tel"
                  maxLength={10}
                  value={data.mobile || ""}
                  onChange={set("mobile")}
                  placeholder="10-digit mobile"
                />
                <FieldError msg={errors.mobile} />
              </div>
              <FieldError msg={errors._} />
              {!otpSent ? (
                <div className="form-actions">
                  <button className="btn" onClick={() => back(1)}>
                    ← Back
                  </button>
                  <button
                    className="btn primary"
                    disabled={loading}
                    onClick={async () => {
                      const e = {};
                      if (!/^\d{12}$/.test(data.aadhaar || ""))
                        e.aadhaar = "Enter a valid 12-digit Aadhaar number.";
                      if (!/^\d{10}$/.test(data.mobile || ""))
                        e.mobile = "Enter a valid 10-digit mobile number.";
                      if (Object.keys(e).length) {
                        setErrors(e);
                        return;
                      }
                      setErrors({});
                      setLoading(true);
                      try {
                        const res = await post("/api/v1/otp/candidates/send", {
                          mobile: data.mobile,
                        });
                        if (import.meta.env.DEV && res?.data?.dev_otp)
                          setOtp(res.data.dev_otp);
                        setOtpSent(true);
                      } catch (err) {
                        setErrors({ _: err.message || "Failed to send OTP." });
                      } finally {
                        setLoading(false);
                      }
                    }}
                  >
                    {loading ? "Sending OTP…" : "Send OTP"}
                  </button>
                </div>
              ) : (
                <>
                  <div className="form-field">
                    <label>OTP (sent to {data.mobile}) *</label>
                    <input
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="6-digit OTP"
                    />
                  </div>
                  <div className="form-actions">
                    <button className="btn" onClick={() => setOtpSent(false)}>
                      ← Resend OTP
                    </button>
                    <button
                      className="btn primary"
                      disabled={loading || otp.length < 6}
                      onClick={async () => {
                        setLoading(true);
                        try {
                          await post("/api/v1/otp/candidates/verify", {
                            mobile: data.mobile,
                            otp,
                          });
                          await post("/api/v1/candidates/register/init", {
                            aadhaar: data.aadhaar,
                            mobile: data.mobile,
                          });
                          go(3);
                        } catch (err) {
                          setErrors({ _: err.message || "Invalid OTP." });
                        } finally {
                          setLoading(false);
                        }
                      }}
                    >
                      {loading ? "Verifying…" : "Verify & Continue ▶"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        );

      /* ── Step 3: Personal ── */
      case 3:
        return (
          <>
            <h2 style={{ fontSize: 16, marginBottom: 12 }}>
              Step 3: Personal Details
            </h2>
            <div className="form-row">
              {[
                ["name_en", "Full Name (English) *"],
                ["father_husband_name", "Father's / Husband's Name *"],
              ].map(([f, label]) => (
                <div className="form-field" key={f}>
                  <label>{label}</label>
                  <input type="text" value={data[f] || ""} onChange={set(f)} />
                  <FieldError msg={errors[f]} />
                </div>
              ))}
              <div className="form-field">
                <label>Full Name (Gujarati)</label>
                <input
                  type="text"
                  value={data._name_gu_raw || ""}
                  placeholder="type phonetically e.g. yaksh patel"
                  onChange={(e) => {
                    const raw = e.target.value;
                    setData((p) => ({
                      ...p,
                      _name_gu_raw: raw,
                      name_gu: transliterateToGujarati(raw),
                    }));
                  }}
                />
                {data.name_gu && (
                  <div
                    style={{
                      marginTop: 4,
                      padding: "4px 8px",
                      background: "var(--ojas-cream)",
                      border: "1px solid var(--ojas-border)",
                      borderRadius: 3,
                      fontFamily: "var(--font-guj)",
                      fontSize: 15,
                    }}
                  >
                    {data.name_gu}
                  </div>
                )}
                <span style={{ fontSize: 11, color: "var(--ojas-ink-3)" }}>
                  Type in English — preview shows Gujarati conversion
                </span>
              </div>
              <div className="form-field">
                <label>Date of Birth *</label>
                <input
                  type="date"
                  value={data.dob || ""}
                  onChange={set("dob")}
                />
                <FieldError msg={errors.dob} />
              </div>
              <div className="form-field">
                <label>Gender *</label>
                <select value={data.gender || ""} onChange={set("gender")}>
                  <option value="">Select…</option>
                  {GENDERS.map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </select>
                <FieldError msg={errors.gender} />
              </div>
              <div className="form-field">
                <label>Category *</label>
                <select value={data.category || ""} onChange={set("category")}>
                  <option value="">Select…</option>
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
                <FieldError msg={errors.category} />
              </div>
              <FieldError msg={errors._} />
              <div className="form-actions">
                <button className="btn" onClick={() => back(2)}>
                  ← Back
                </button>
                <button
                  className="btn primary"
                  disabled={loading}
                  onClick={() => {
                    const e = {};
                    if (!data.name_en?.trim()) e.name_en = "Required";
                    if (!data.father_husband_name?.trim()) e.father_husband_name = "Required";
                    if (!data.dob) e.dob = "Required";
                    if (!data.gender) e.gender = "Required";
                    if (!data.category) e.category = "Required";
                    if (Object.keys(e).length) {
                      setErrors(e);
                      return;
                    }
                    saveStep({
                      name_en: data.name_en,
                      name_gu: data.name_gu,
                      father_husband_name: data.father_husband_name,
                      dob: data.dob,
                      gender: data.gender,
                      category: data.category,
                    });
                  }}
                >
                  {loading ? "Saving…" : "Save & Continue ▶"}
                </button>
              </div>
            </div>
          </>
        );

      /* ── Step 4: Communication ── */
      case 4:
        return (
          <>
            <h2 style={{ fontSize: 16, marginBottom: 12 }}>
              Step 4: Communication Details
            </h2>
            <div className="form-row">
              <div className="form-field" style={{ gridColumn: "1/-1" }}>
                <label>Permanent Address *</label>
                <textarea
                  rows={3}
                  value={data.permanent_address || ""}
                  onChange={set("permanent_address")}
                />
                <FieldError msg={errors.permanent_address} />
              </div>
              <div className="form-field" style={{ gridColumn: "1/-1" }}>
                <label
                  style={{ display: "flex", gap: 8, alignItems: "center" }}
                >
                  <input
                    type="checkbox"
                    checked={!!data.same_address}
                    onChange={(e) =>
                      setData((p) => ({
                        ...p,
                        same_address: e.target.checked,
                        current_address: e.target.checked
                          ? p.permanent_address
                          : "",
                      }))
                    }
                  />
                  Current address same as permanent
                </label>
              </div>
              {!data.same_address && (
                <div className="form-field" style={{ gridColumn: "1/-1" }}>
                  <label>Current Address *</label>
                  <textarea
                    rows={3}
                    value={data.current_address || ""}
                    onChange={set("current_address")}
                  />
                  <FieldError msg={errors.current_address} />
                </div>
              )}
              <div className="form-field">
                <label>Email Address *</label>
                <input
                  type="email"
                  value={data.email || ""}
                  onChange={set("email")}
                />
                <FieldError msg={errors.email} />
              </div>
              <FieldError msg={errors._} />
              <div className="form-actions">
                <button className="btn" onClick={() => back(3)}>
                  ← Back
                </button>
                <button
                  className="btn primary"
                  disabled={loading}
                  onClick={() => {
                    const e = {};
                    if (!data.permanent_address?.trim())
                      e.permanent_address = "Required";
                    if (!data.same_address && !data.current_address?.trim())
                      e.current_address = "Required";
                    if (!data.email?.includes("@"))
                      e.email = "Valid email required";
                    if (Object.keys(e).length) {
                      setErrors(e);
                      return;
                    }
                    saveStep({
                      address_permanent: { line1: data.permanent_address },
                      address_current: {
                        same_as_permanent: !!data.same_address,
                        ...(data.same_address ? {} : { line1: data.current_address }),
                      },
                      email: data.email,
                    });
                  }}
                >
                  {loading ? "Saving…" : "Save & Continue ▶"}
                </button>
              </div>
            </div>
          </>
        );

      /* ── Step 5: Other ── */
      case 5:
        return (
          <>
            <h2 style={{ fontSize: 16, marginBottom: 12 }}>
              Step 5: Other Details
            </h2>
            <div className="form-row">
              <div className="form-field">
                <label>Marital Status</label>
                <select
                  value={data.marital_status || ""}
                  onChange={set("marital_status")}
                >
                  <option value="">Select…</option>
                  {["Single", "Married", "Divorced", "Widowed"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label>Highest Qualification *</label>
                <input
                  type="text"
                  value={data.qualification || ""}
                  onChange={set("qualification")}
                  placeholder="e.g. B.E. Civil"
                />
                <FieldError msg={errors.qualification} />
              </div>
              <div className="form-field">
                <label style={{ display: "flex", gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={!!data.ph_status}
                    onChange={(e) =>
                      setData((p) => ({ ...p, ph_status: e.target.checked }))
                    }
                  />
                  Physically Handicapped (PH)
                </label>
              </div>
              <div className="form-field">
                <label style={{ display: "flex", gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={!!data.ex_serviceman}
                    onChange={(e) =>
                      setData((p) => ({
                        ...p,
                        ex_serviceman: e.target.checked,
                      }))
                    }
                  />
                  Ex-Serviceman
                </label>
              </div>
              <FieldError msg={errors._} />
              <div className="form-actions">
                <button className="btn" onClick={() => back(4)}>
                  ← Back
                </button>
                <button
                  className="btn primary"
                  disabled={loading}
                  onClick={() => {
                    if (!data.qualification?.trim()) {
                      setErrors({ qualification: "Required" });
                      return;
                    }
                    saveStep({
                      marital_status: data.marital_status,
                      qualification: data.qualification,
                      ph_status: !!data.ph_status,
                      ex_serviceman: !!data.ex_serviceman,
                    });
                  }}
                >
                  {loading ? "Saving…" : "Save & Continue ▶"}
                </button>
              </div>
            </div>
          </>
        );

      /* ── Step 6: Languages ── */
      case 6: {
        const langs = data.languages || [
          { language: "", read: false, write: false, speak: false },
        ];
        const updateLang = (i, patch) =>
          setData((p) => {
            const a = [...(p.languages || langs)];
            a[i] = { ...a[i], ...patch };
            return { ...p, languages: a };
          });
        return (
          <>
            <h2 style={{ fontSize: 16, marginBottom: 12 }}>
              Step 6: Languages
            </h2>
            {langs.map((lang, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <input
                  type="text"
                  placeholder="Language"
                  value={lang.language}
                  style={{ flex: 1 }}
                  onChange={(e) => updateLang(i, { language: e.target.value })}
                />
                {["read", "write", "speak"].map((sk) => (
                  <label
                    key={sk}
                    style={{ display: "flex", gap: 4, fontSize: 12 }}
                  >
                    <input
                      type="checkbox"
                      checked={!!lang[sk]}
                      onChange={(e) =>
                        updateLang(i, { [sk]: e.target.checked })
                      }
                    />
                    {sk[0].toUpperCase() + sk.slice(1)}
                  </label>
                ))}
                {i > 0 && (
                  <button
                    onClick={() =>
                      setData((p) => ({
                        ...p,
                        languages: langs.filter((_, j) => j !== i),
                      }))
                    }
                    style={{
                      color: "var(--ojas-red)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 18,
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button
              className="btn"
              style={{ fontSize: 12, marginBottom: 12 }}
              onClick={() =>
                setData((p) => ({
                  ...p,
                  languages: [
                    ...langs,
                    { language: "", read: false, write: false, speak: false },
                  ],
                }))
              }
            >
              + Add Language
            </button>
            <FieldError msg={errors._} />
            <div className="form-actions">
              <button className="btn" onClick={() => back(5)}>
                ← Back
              </button>
              <button
                className="btn primary"
                disabled={loading}
                onClick={() => saveStep({ languages: langs })}
              >
                {loading ? "Saving…" : "Save & Continue ▶"}
              </button>
            </div>
          </>
        );
      }

      /* ── Step 7: Photo ── */
      case 7:
        return (
          <>
            <h2 style={{ fontSize: 16, marginBottom: 12 }}>
              Step 7: Upload Photo
            </h2>
            <div className="notice info" style={{ fontSize: 12 }}>
              JPEG/PNG · Max 100 KB · White background · Clear face visible
            </div>
            <div style={{ marginTop: 12 }}>
              <input
                ref={photoRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                onChange={(e) =>
                  setData((p) => ({
                    ...p,
                    photoFile: e.target.files[0],
                    photoPreview: e.target.files[0]
                      ? URL.createObjectURL(e.target.files[0])
                      : null,
                  }))
                }
              />
              <FieldError msg={errors.photo} />
              {data.photoPreview && (
                <img
                  src={data.photoPreview}
                  alt="Preview"
                  style={{
                    display: "block",
                    marginTop: 10,
                    maxHeight: 160,
                    border: "1px solid var(--ojas-line)",
                  }}
                />
              )}
            </div>
            <div className="form-actions" style={{ marginTop: 16 }}>
              <button className="btn" onClick={() => back(6)}>
                ← Back
              </button>
              <button
                className="btn primary"
                disabled={loading}
                onClick={() =>
                  uploadFile(
                    "/api/v1/candidates/register/photo",
                    "photo",
                    data.photoFile,
                    100,
                  )
                }
              >
                {loading ? "Uploading…" : "Upload & Continue ▶"}
              </button>
            </div>
          </>
        );

      /* ── Step 8: Signature ── */
      case 8:
        return (
          <>
            <h2 style={{ fontSize: 16, marginBottom: 12 }}>
              Step 8: Upload Signature
            </h2>
            <div className="notice info" style={{ fontSize: 12 }}>
              JPEG only · Max 20 KB · Black/blue ink on white paper
            </div>
            <div style={{ marginTop: 12 }}>
              <input
                ref={sigRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                onChange={(e) =>
                  setData((p) => ({
                    ...p,
                    sigFile: e.target.files[0],
                    sigPreview: e.target.files[0]
                      ? URL.createObjectURL(e.target.files[0])
                      : null,
                  }))
                }
              />
              <FieldError msg={errors.signature} />
              {data.sigPreview && (
                <img
                  src={data.sigPreview}
                  alt="Preview"
                  style={{
                    display: "block",
                    marginTop: 10,
                    maxHeight: 80,
                    border: "1px solid var(--ojas-line)",
                  }}
                />
              )}
            </div>
            <div className="form-actions" style={{ marginTop: 16 }}>
              <button className="btn" onClick={() => back(7)}>
                ← Back
              </button>
              <button
                className="btn primary"
                disabled={loading}
                onClick={() =>
                  uploadFile(
                    "/api/v1/candidates/register/signature",
                    "signature",
                    data.sigFile,
                    20,
                  )
                }
              >
                {loading ? "Uploading…" : "Upload & Continue ▶"}
              </button>
            </div>
          </>
        );

      /* ── Step 9: Declaration ── */
      case 9:
        return (
          <>
            <h2 style={{ fontSize: 16, marginBottom: 12 }}>
              Step 9: Declaration
            </h2>
            <div
              className="notice info"
              style={{ maxHeight: 240, overflowY: "auto", fontSize: 13 }}
            >
              <div className="title">Declaration / ઘોષણા</div>
              <p>
                I hereby declare that all the information furnished is true and
                correct to the best of my knowledge. I understand that if any
                information is found false, my candidature is liable to be
                cancelled at any stage.
              </p>
              <p
                style={{
                  fontFamily: "var(--font-guj)",
                  fontSize: 12,
                  marginTop: 8,
                }}
              >
                હું ઘોષિત કરું છું કે ઉપરોક્ત બધી માહિતી સત્ય અને સાચી છે.
              </p>
            </div>
            <label
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                marginTop: 12,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={!!data.declared}
                onChange={(e) =>
                  setData((p) => ({ ...p, declared: e.target.checked }))
                }
              />
              <span style={{ fontSize: 13 }}>
                I accept the above declaration.
              </span>
            </label>
            <div className="form-actions" style={{ marginTop: 16 }}>
              <button className="btn" onClick={() => back(8)}>
                ← Back
              </button>
              <button
                className="btn primary"
                disabled={!data.declared}
                onClick={() => go(10)}
              >
                Proceed to Submit ▶
              </button>
            </div>
          </>
        );

      /* ── Step 10: Submit ── */
      case 10:
        return (
          <>
            <h2 style={{ fontSize: 16, marginBottom: 12 }}>
              Step 10: Submit Registration
            </h2>
            {registrationId === "sent" ? (
              <div className="notice info" style={{ textAlign: "center" }}>
                <div
                  className="title"
                  style={{ color: "#2a7a2a", fontSize: 18 }}
                >
                  ✓ Registration Submitted
                </div>
                <p style={{ marginTop: 8, fontSize: 13.5 }}>
                  Your Registration ID has been sent to your registered{" "}
                  <strong>mobile number</strong> and{" "}
                  <strong>email address</strong>.
                </p>
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--ojas-ink-3)",
                    marginTop: 8,
                  }}
                >
                  Keep that ID safe — you will need it to login and apply for
                  posts.
                </p>
                <div style={{ marginTop: 16 }}>
                  <button
                    className="btn primary"
                    onClick={() => navigate("/careers")}
                  >
                    Apply for a Post ▶
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="notice warn" style={{ fontSize: 13 }}>
                  <div className="title">Final Check</div>
                  Once submitted, details cannot be changed without a formal
                  request. Please review before submitting.
                </div>
                <FieldError msg={errors._} />
                <div className="form-actions" style={{ marginTop: 16 }}>
                  <button className="btn" onClick={() => back(9)}>
                    ← Back
                  </button>
                  <button
                    className="btn primary"
                    disabled={loading}
                    onClick={async () => {
                      setErrors({});
                      setLoading(true);
                      try {
                        // password field removed (OTP login); auto-generate throwaway value
                        await post("/api/v1/candidates/register/submit", {
                          name: data.name_en || data.name_gu || "Candidate",
                          password: crypto.randomUUID() + crypto.randomUUID(),
                        });
                        setRegId("sent");
                      } catch (err) {
                        setErrors({
                          _:
                            err.message ||
                            "Submission failed. Please try again.",
                        });
                      } finally {
                        setLoading(false);
                      }
                    }}
                  >
                    {loading ? "Submitting…" : "Submit Registration"}
                  </button>
                </div>
              </>
            )}
          </>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <div className="page-heading">
        <h1>OTR — One Time Registration</h1>
        <span className="guj">એક વખત નોંધણી</span>
      </div>
      <div className="box" style={{ maxWidth: 720, margin: "0 auto" }}>
        <div className="box-body">
          <StepIndicator total={TOTAL_STEPS} current={step} />
          {sessionMissing ? (
            <div className="notice warn">
              <div className="title">No Registration In Progress</div>
              <p style={{ fontSize: 13, marginTop: 4 }}>
                Your registration session has expired or was not started. Please
                begin from Step 1.
              </p>
              <div className="form-actions" style={{ marginTop: 12 }}>
                <button
                  className="btn primary"
                  onClick={() => {
                    setSessionMissing(false);
                    go(1);
                  }}
                >
                  ← Start from Step 1
                </button>
              </div>
            </div>
          ) : (
            renderStep()
          )}
        </div>
      </div>
    </>
  );
}
