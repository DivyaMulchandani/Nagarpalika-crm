import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import StepIndicator from "./StepIndicator";
import { IconPdf, IconCheckCircle } from "../../components/Icons";
import { get, post } from "../../api/index";
import { transliterateToGujarati } from "../../utils/gujaratiTransliterate";

const API_BASE = import.meta.env.VITE_API_URL || "";

const TOTAL_STEPS = 10;
const PASSWORD_RE = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\|;'`~]).{8,}$/;
const CATEGORIES = ["General", "OBC", "SC", "ST", "EWS"];
const GENDERS = ["Male", "Female", "Other"];
const CERT_REQUIRED_CATS = new Set(["OBC", "SC", "ST", "EWS"]);
const DEFAULT_PORTAL_CONFIG = {
  uploadLimits: {
    photoMaxBytes: 5 * 1024 * 1024,
    photoMaxLabel: "5 MB",
    signatureMaxBytes: 5 * 1024 * 1024,
    signatureMaxLabel: "5 MB",
    documentMaxBytes: 10 * 1024 * 1024,
    documentMaxLabel: "10 MB",
  },
  otp: { maxVerifyAttempts: 3 },
};

const formatBytes = (bytes) => {
  if (bytes >= 1024 * 1024) {
    const mb = bytes / (1024 * 1024);
    return Number.isInteger(mb) ? `${mb} MB` : `${mb.toFixed(1)} MB`;
  }
  return `${Math.round(bytes / 1024)} KB`;
};

const isOthersQualification = (name) => /^others$/i.test(name || "");

function FieldError({ msg }) {
  return msg ? (
    <p style={{ color: "var(--ojas-red)", fontSize: 12, margin: "2px 0 0" }}>
      {msg}
    </p>
  ) : null;
}

const SESSION_KEY = "otr_form_data";
const NON_SERIALIZABLE = new Set([
  "casteCertFile", "casteCertPreview", "casteCertIsPdf",
  "photoFile", "photoPreview",
  "sigFile", "sigPreview",
  "udidCertFile", "udidCertPreview", "udidCertIsPdf",
]);

function loadPersistedData() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function persistData(data) {
  const serializable = Object.fromEntries(
    Object.entries(data).filter(([k]) => !NON_SERIALIZABLE.has(k))
  );
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(serializable));
}

export default function RegistrationStep() {
  const { step: stepStr } = useParams();
  const navigate = useNavigate();
  const step = Math.max(1, Math.min(parseInt(stepStr) || 1, TOTAL_STEPS));

  const [data, setData] = useState(() => loadPersistedData());
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [detailsVerified, setDetailsVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [registrationId, setRegId] = useState(null);
  const [sessionMissing, setSessionMissing] = useState(false);
  const [portalConfig, setPortalConfig] = useState(DEFAULT_PORTAL_CONFIG);
  const [qualifications, setQualifications] = useState([]);

  const photoRef = useRef();
  const sigRef = useRef();

  useEffect(() => {
    persistData(data);
  }, [data]);

  useEffect(() => {
    get("/api/v1/config/portal")
      .then((res) => {
        if (res?.data) setPortalConfig(res.data);
      })
      .catch(() => {});
    get("/api/v1/qualifications/public")
      .then((res) => {
        const list = (res?.data || []).map((q) => q.name).filter(Boolean);
        setQualifications(list);
      })
      .catch(() => {});
  }, []);

  const set = (field) => (e) =>
    setData((p) => ({ ...p, [field]: e.target.value }));
  // Keyboard restrictions: digits-only / letters-only setters
  const setDigits = (field, len) => (e) =>
    setData((p) => ({
      ...p,
      [field]: e.target.value.replace(/\D/g, "").slice(0, len),
    }));
  const setName = (field) => (e) =>
    setData((p) => ({
      ...p,
      [field]: e.target.value.replace(/[^A-Za-z\s.']/g, "").slice(0, 100),
    }));
  const go = (n) => navigate(`/registration/apply/step/${n}`);
  const back = (n) => go(n);

  // ── Session guard: steps 3+ require an active registration session ──
  useEffect(() => {
    if (step <= 2) return;
    get("/api/v1/candidates/register/resume")
      .then((res) => {
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

  const uploadFile = async (url, field, file, maxBytes, maxLabel) => {
    if (!file) {
      setErrors({ [field]: "Please select a file." });
      return;
    }
    if (file.size > maxBytes) {
      setErrors({ [field]: `File must be under ${maxLabel || formatBytes(maxBytes)}.` });
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
              <div className="title">
                <span style={{ fontFamily: "var(--font-guj)", fontSize: 15 }}>
                  આગળ વધતા પહેલાં વાંચો
                </span>
                <br />
                <span style={{ fontSize: 12 }}>(Read Before Proceeding)</span>
              </div>
              <ol style={{ paddingLeft: 20, lineHeight: 1.6 }}>
                <li style={{ marginBottom: 6 }}>
                  <span style={{ fontFamily: "var(--font-guj)", fontSize: 14 }}>
                    એક વખત નોંધણી (OTR) એક જ વખત થાય છે. ઔપચારિક વિનંતી વિના વિગતો બદલી શકાતી નથી.
                  </span>
                  <br />
                  <span style={{ fontSize: 12 }}>
                    (One Time Registration (OTR) is done once. Details cannot be changed without a formal request.)
                  </span>
                </li>
                <li style={{ marginBottom: 6 }}>
                  <span style={{ fontFamily: "var(--font-guj)", fontSize: 14 }}>
                    તમારું આધાર કાર્ડ, મોબાઇલ નંબર અને ઇ-મેઇલ તૈયાર રાખો.
                  </span>
                  <br />
                  <span style={{ fontSize: 12 }}>
                    (Keep your Aadhaar card, mobile number, and email ready.)
                  </span>
                </li>
                <li style={{ marginBottom: 6 }}>
                  <span style={{ fontFamily: "var(--font-guj)", fontSize: 14 }}>
                    ફોટો: JPEG/PNG, મહત્તમ 2 MB, સફેદ પૃષ્ઠભૂ, સ્પષ્ટ ચહેરો.
                  </span>
                  <br />
                  <span style={{ fontSize: 12 }}>
                    (Photo: JPEG/PNG, max 2 MB, white background, clear face.)
                  </span>
                </li>
                <li style={{ marginBottom: 6 }}>
                  <span style={{ fontFamily: "var(--font-guj)", fontSize: 14 }}>
                    સહી: માત્ર JPEG, મહત્તમ 2 MB, સફેદ કાગળ પર કાળી/વાદળી શાહી.
                  </span>
                  <br />
                  <span style={{ fontSize: 12 }}>
                    (Signature: JPEG only, max 2 MB, black/blue ink on white paper.)
                  </span>
                </li>
                <li style={{ marginBottom: 6 }}>
                  <span style={{ fontFamily: "var(--font-guj)", fontSize: 14 }}>
                    OTR નો અર્થ એ નથી કે કોઈ પણ જગ્યા માટેની તમારી અરજી સ્વીકારાઈ ગઈ છે.
                  </span>
                  <br />
                  <span style={{ fontSize: 12 }}>
                    (OTR does <strong>NOT</strong> mean your application for any post is accepted.)
                  </span>
                </li>
              </ol>
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
                  inputMode="numeric"
                  maxLength={12}
                  value={data.aadhaar || ""}
                  onChange={setDigits("aadhaar", 12)}
                  placeholder="12-digit Aadhaar"
                  disabled={detailsVerified}
                />
                <FieldError msg={errors.aadhaar} />
              </div>
              <div className="form-field">
                <label>Mobile Number *</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={data.mobile || ""}
                  onChange={setDigits("mobile", 10)}
                  placeholder="10-digit mobile"
                  disabled={detailsVerified}
                />
                <FieldError msg={errors.mobile} />
              </div>
              <div className="form-field">
                <label>Create Password *</label>
                <input
                  type="password"
                  value={data.password || ""}
                  onChange={set("password")}
                  placeholder="Min 8 chars, 1 uppercase, 1 digit, 1 special"
                  disabled={detailsVerified}
                />
                <FieldError msg={errors.password} />
              </div>
              <div className="form-field">
                <label>Confirm Password *</label>
                <input
                  type="password"
                  value={data.passwordConfirm || ""}
                  onChange={set("passwordConfirm")}
                  placeholder="Re-enter password"
                  disabled={detailsVerified}
                />
                <FieldError msg={errors.passwordConfirm} />
              </div>
              <FieldError msg={errors._} />
              {!detailsVerified ? (
                <div className="form-actions">
                  <button className="btn" onClick={() => back(1)}>← Back</button>
                  <button
                    className="btn primary"
                    disabled={loading}
                    onClick={async () => {
                      const e = {};
                      if (!/^\d{12}$/.test(data.aadhaar || "")) e.aadhaar = "Enter a valid 12-digit Aadhaar number.";
                      if (!/^[6-9]\d{9}$/.test(data.mobile || "")) e.mobile = "Enter a valid 10-digit mobile number.";
                      if (!data.password || !PASSWORD_RE.test(data.password))
                        e.password = "Password must be 8+ chars with uppercase, digit, and special character.";
                      if (data.password !== data.passwordConfirm)
                        e.passwordConfirm = "Passwords do not match.";
                      if (Object.keys(e).length) { setErrors(e); return; }
                      setErrors({});
                      setLoading(true);
                      try {
                        await post("/api/v1/candidates/verify/aadhaar", { aadhaar: data.aadhaar });
                        await post("/api/v1/candidates/verify/mobile", { mobile: data.mobile });
                        setDetailsVerified(true);
                      } catch (err) {
                        const msg = err.message || "Verification failed.";
                        if (msg.toLowerCase().includes("aadhaar")) setErrors({ aadhaar: msg });
                        else if (msg.toLowerCase().includes("mobile")) setErrors({ mobile: msg });
                        else setErrors({ _: msg });
                      } finally { setLoading(false); }
                    }}
                  >
                    {loading ? "Verifying…" : "Verify Details"}
                  </button>
                </div>
              ) : !otpSent ? (
                <div className="form-actions">
                  <button className="btn" onClick={() => { setDetailsVerified(false); setOtpSent(false); }}>← Edit Details</button>
                  <button
                    className="btn primary"
                    disabled={loading}
                    onClick={async () => {
                      setErrors({});
                      setLoading(true);
                      try {
                        const res = await post("/api/v1/otp/candidates/send", {
                          mobile: data.mobile,
                          aadhaar: data.aadhaar,
                        });
                        if (import.meta.env.DEV && res?.data?.dev_otp) setOtp(res.data.dev_otp);
                        setOtpSent(true);
                      } catch (err) {
                        const msg = err.message || "Failed to send OTP.";
                        if (msg.toLowerCase().includes("mobile") && msg.toLowerCase().includes("registered"))
                          setErrors({ mobile: "This mobile number is already registered. Please login instead." });
                        else setErrors({ _: msg });
                      } finally { setLoading(false); }
                    }}
                  >
                    {loading ? "Sending OTP…" : "Send OTP"}
                  </button>
                </div>
              ) : (
                <>
                  <div className="form-field">
                    <label>OTP (sent to {data.mobile}) *</label>
                    <p style={{ fontSize: 12, margin: "2px 0 6px", color: "var(--ojas-ink-3)" }}>
                      Up to {portalConfig.otp.maxVerifyAttempts} verification attempts allowed.
                    </p>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="6-digit OTP"
                    />
                  </div>
                  <div className="form-actions">
                    <button className="btn" onClick={() => setOtpSent(false)}>← Resend OTP</button>
                    <button
                      className="btn primary"
                      disabled={loading || otp.length < 6}
                      onClick={async () => {
                        setLoading(true);
                        try {
                          await post("/api/v1/otp/candidates/verify", { mobile: data.mobile, otp });
                          await post("/api/v1/candidates/register/init", { aadhaar: data.aadhaar, mobile: data.mobile });
                          go(3);
                        } catch (err) {
                          const msg = err.message || "Invalid OTP.";
                          if (msg.toLowerCase().includes("aadhaar") && msg.toLowerCase().includes("registered"))
                            setErrors({ aadhaar: "This Aadhaar is already registered. Please login instead." });
                          else setErrors({ _: msg });
                        } finally { setLoading(false); }
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
      case 3: {
        const needsCasteCert = CERT_REQUIRED_CATS.has(data.category);
        return (
          <>
            <h2 style={{ fontSize: 16, marginBottom: 12 }}>
              Step 3: Personal Details / વ્યક્તિગત વિગતો
            </h2>
            <div className="form-row">
              <div className="form-field">
                <label>Full Name (English) / પૂરું નામ (અંગ્રેજી) *</label>
                <input
                  type="text"
                  value={data.name_en || ""}
                  onChange={setName("name_en")}
                  maxLength={100}
                />
                <FieldError msg={errors.name_en} />
              </div>
              <div className="form-field">
                <label>Father's / Husband's Name / પિતા / પતિનું નામ *</label>
                <input
                  type="text"
                  value={data.father_husband_name || ""}
                  onChange={setName("father_husband_name")}
                  maxLength={100}
                />
                <FieldError msg={errors.father_husband_name} />
              </div>
              <div className="form-field">
                <label>Date of Birth / જન્મ તારીખ *</label>
                <input
                  type="date"
                  value={data.dob || ""}
                  onChange={set("dob")}
                  min={`${new Date().getFullYear() - 100}-01-01`}
                  max={new Date(Date.now() - 18 * 365.25 * 86400 * 1000)
                    .toISOString()
                    .slice(0, 10)}
                />
                <FieldError msg={errors.dob} />
              </div>
              <div className="form-field">
                <label>Gender / લિંગ *</label>
                <select value={data.gender || ""} onChange={set("gender")}>
                  <option value="">Select…</option>
                  {GENDERS.map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </select>
                <FieldError msg={errors.gender} />
              </div>
              <div className="form-field">
                <label>Category / શ્રેણી *</label>
                <select value={data.category || ""} onChange={set("category")}>
                  <option value="">Select…</option>
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
                <FieldError msg={errors.category} />
              </div>
              {needsCasteCert && (
                <>
                  <div className="form-field" style={{ gridColumn: "1/-1" }}>
                    <label>Caste Certificate / જ્ઞાતિ પ્રમાણ પત્ર *</label>
                    <p style={{ fontSize: 12, margin: "2px 0 6px", color: "var(--ojas-ink-3)" }}>
                      PDF or image · Max {portalConfig.uploadLimits.documentMaxLabel}
                    </p>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        setData((p) => ({
                          ...p,
                          casteCertFile: file,
                          casteCertPreview: file
                            ? URL.createObjectURL(file)
                            : null,
                          casteCertIsPdf: file?.type === "application/pdf",
                        }));
                      }}
                    />
                    {data.casteCertFile?.name && (
                      <p style={{ fontSize: 12, margin: "4px 0 0", color: "var(--ojas-ink-3)" }}>
                        📎 {data.casteCertFile.name}
                      </p>
                    )}
                    <FieldError msg={errors.casteCertFile} />
                    {data.casteCertPreview &&
                      (data.casteCertIsPdf ? (
                        <div
                          style={{
                            marginTop: 6,
                            fontSize: 12,
                            color: "var(--ojas-ink-3)",
                          }}
                        >
                          <IconPdf /> {data.casteCertFile?.name}
                          <a
                            href={data.casteCertPreview}
                            target="_blank"
                            rel="noreferrer"
                            style={{ marginLeft: 8 }}
                          >
                            View PDF
                          </a>
                        </div>
                      ) : (
                        <img
                          src={data.casteCertPreview}
                          alt="Caste certificate preview"
                          style={{
                            display: "block",
                            marginTop: 10,
                            maxHeight: 160,
                            maxWidth: 160,
                            objectFit: "contain",
                            border: "1px solid var(--ojas-line)",
                          }}
                        />
                      ))}
                  </div>
                </>
              )}
              <FieldError msg={errors._} />
              <div className="form-actions">
                <button className="btn" onClick={() => back(2)}>
                  ← Back
                </button>
                <button
                  className="btn primary"
                  disabled={loading}
                  onClick={async () => {
                    const e = {};
                    if (!data.name_en?.trim()) e.name_en = "Required";
                    if (!data.father_husband_name?.trim())
                      e.father_husband_name = "Required";
                    if (!data.dob) e.dob = "Required";
                    if (!data.gender) e.gender = "Required";
                    if (!data.category) e.category = "Required";
                    if (needsCasteCert) {
                      if (!data.casteCertFile)
                        e.casteCertFile =
                          "Please upload your caste certificate.";
                    }
                    if (Object.keys(e).length) {
                      setErrors(e);
                      return;
                    }

                    if (needsCasteCert && data.casteCertFile) {
                      const docMax = portalConfig.uploadLimits.documentMaxBytes;
                      const docLabel = portalConfig.uploadLimits.documentMaxLabel;
                      if (data.casteCertFile.size > docMax) {
                        setErrors({ casteCertFile: `File must be under ${docLabel}.` });
                        return;
                      }
                      setErrors({});
                      setLoading(true);
                      const fd = new FormData();
                      fd.append("caste_cert", data.casteCertFile);
                      try {
                        const res = await fetch(
                          `${API_BASE}/api/v1/candidates/register/caste-cert`,
                          {
                            method: "POST",
                            credentials: "include",
                            body: fd,
                          },
                        );
                        if (!res.ok) {
                          const json = await res.json().catch(() => ({}));
                          setErrors({
                            casteCertFile: json?.message || "Upload failed.",
                          });
                          setLoading(false);
                          return;
                        }
                      } catch (err) {
                        setErrors({
                          casteCertFile: err.message || "Upload failed.",
                        });
                        setLoading(false);
                        return;
                      }
                      setLoading(false);
                    }

                    saveStep({
                      name_en: data.name_en,
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
      }

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
                    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email || ""))
                      e.email = "Valid email required";
                    if (Object.keys(e).length) {
                      setErrors(e);
                      return;
                    }
                    saveStep({
                      address_permanent: { line1: data.permanent_address },
                      address_current: {
                        same_as_permanent: !!data.same_address,
                        ...(data.same_address
                          ? {}
                          : { line1: data.current_address }),
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
      case 5: {
        const isOthersQual = isOthersQualification(data.qualification);
        const finalQual = isOthersQual
          ? data.qualification_other
          : data.qualification;
        return (
          <>
            <h2 style={{ fontSize: 16, marginBottom: 12 }}>
              Step 5: Other Details / અન્ય વિગતો
            </h2>
            <div className="form-row">
              <div className="form-field">
                <label>Marital Status / વૈવાહિક સ્થિતિ</label>
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
                <label>
                  Highest Qualification / સર્વોચ્ચ શૈક્ષણિક લાયકાત *
                </label>
                <select
                  value={data.qualification || ""}
                  onChange={set("qualification")}
                >
                  <option value="">Select…</option>
                  {qualifications.map((q) => (
                    <option key={q}>{q}</option>
                  ))}
                </select>
                <FieldError msg={errors.qualification} />
              </div>
              {isOthersQual && (
                <div className="form-field">
                  <label>Specify Qualification / લાયકાત સ્પષ્ટ કરો *</label>
                  <input
                    type="text"
                    value={data.qualification_other || ""}
                    onChange={set("qualification_other")}
                    placeholder="Enter your qualification"
                  />
                  <FieldError msg={errors.qualification_other} />
                </div>
              )}
              <div className="form-field">
                <label style={{ display: "flex", gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={!!data.ph_status}
                    onChange={(e) =>
                      setData((p) => ({ ...p, ph_status: e.target.checked }))
                    }
                  />
                  Physically Handicapped (PH) / શારીરિક અક્ષમ
                </label>
              </div>
              {data.ph_status && (
                <>
                  <div className="form-field" style={{ gridColumn: "1/-1" }}>
                    <label>UDID Certificate / UDID પ્રમાણ પત્ર *</label>
                    <p style={{ fontSize: 12, margin: "2px 0 6px", color: "var(--ojas-ink-3)" }}>
                      PDF or image · Max {portalConfig.uploadLimits.documentMaxLabel}
                    </p>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        setData((p) => ({
                          ...p,
                          udidCertFile: file,
                          udidCertPreview: file
                            ? URL.createObjectURL(file)
                            : null,
                          udidCertIsPdf: file?.type === "application/pdf",
                        }));
                      }}
                    />
                    {data.udidCertFile?.name && (
                      <p style={{ fontSize: 12, margin: "4px 0 0", color: "var(--ojas-ink-3)" }}>
                        📎 {data.udidCertFile.name}
                      </p>
                    )}
                    <FieldError msg={errors.udidCertFile} />
                    {data.udidCertPreview &&
                      (data.udidCertIsPdf ? (
                        <div
                          style={{
                            marginTop: 6,
                            fontSize: 12,
                            color: "var(--ojas-ink-3)",
                          }}
                        >
                          <IconPdf /> {data.udidCertFile?.name}
                          <a
                            href={data.udidCertPreview}
                            target="_blank"
                            rel="noreferrer"
                            style={{ marginLeft: 8 }}
                          >
                            View PDF
                          </a>
                        </div>
                      ) : (
                        <img
                          src={data.udidCertPreview}
                          alt="UDID certificate preview"
                          style={{
                            display: "block",
                            marginTop: 10,
                            maxHeight: 160,
                            maxWidth: 160,
                            objectFit: "contain",
                            border: "1px solid var(--ojas-line)",
                          }}
                        />
                      ))}
                  </div>
                </>
              )}
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
                  Ex-Serviceman / ભૂતપૂર્વ સૈનિક
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
                  onClick={async () => {
                    const e = {};
                    if (!data.qualification) e.qualification = "Required";
                    if (isOthersQual && !data.qualification_other?.trim())
                      e.qualification_other = "Required";
                    if (data.ph_status) {
                      if (!data.udidCertFile)
                        e.udidCertFile = "Please upload your UDID certificate.";
                    }
                    if (Object.keys(e).length) {
                      setErrors(e);
                      return;
                    }

                    if (data.ph_status && data.udidCertFile) {
                      const docMax = portalConfig.uploadLimits.documentMaxBytes;
                      const docLabel = portalConfig.uploadLimits.documentMaxLabel;
                      if (data.udidCertFile.size > docMax) {
                        setErrors({ udidCertFile: `File must be under ${docLabel}.` });
                        return;
                      }
                      setErrors({});
                      setLoading(true);
                      const fd = new FormData();
                      fd.append("udid_cert", data.udidCertFile);
                      try {
                        const res = await fetch(
                          `${API_BASE}/api/v1/candidates/register/udid-cert`,
                          {
                            method: "POST",
                            credentials: "include",
                            body: fd,
                          },
                        );
                        if (!res.ok) {
                          const json = await res.json().catch(() => ({}));
                          setErrors({
                            udidCertFile: json?.message || "Upload failed.",
                          });
                          setLoading(false);
                          return;
                        }
                      } catch (err) {
                        setErrors({
                          udidCertFile: err.message || "Upload failed.",
                        });
                        setLoading(false);
                        return;
                      }
                      setLoading(false);
                    }

                    saveStep({
                      marital_status: data.marital_status,
                      qualification: finalQual,
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
      }

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
              JPEG/PNG · Max {portalConfig.uploadLimits.photoMaxLabel} · White background · Clear face visible
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
                    portalConfig.uploadLimits.photoMaxBytes,
                    portalConfig.uploadLimits.photoMaxLabel,
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
              JPEG/PNG · Max {portalConfig.uploadLimits.signatureMaxLabel} · Black/blue ink on white paper
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
                    portalConfig.uploadLimits.signatureMaxBytes,
                    portalConfig.uploadLimits.signatureMaxLabel,
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
            {registrationId && registrationId !== "pending" ? (
              <div className="notice info" style={{ textAlign: "center" }}>
                <div
                  className="title"
                  style={{ color: "#2a7a2a", fontSize: 18 }}
                >
                  <IconCheckCircle /> Registration Submitted
                </div>
                <p style={{ marginTop: 8, fontSize: 13.5 }}>
                  Your Registration ID: <strong style={{ fontFamily: "var(--font-mono)", fontSize: 16 }}>{registrationId}</strong>
                </p>
                <p style={{ fontSize: 12, color: "var(--ojas-ink-3)", marginTop: 8 }}>
                  A copy has also been sent to your registered mobile and email.
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
                        const res = await post("/api/v1/candidates/register/submit", {
                          name: data.name_en || data.name_gu || "Candidate",
                          password: data.password,
                        });
                        sessionStorage.removeItem(SESSION_KEY);
                        setRegId(res?.data?.registration_id || "sent");
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
