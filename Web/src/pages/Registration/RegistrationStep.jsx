import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import StepIndicator from "./StepIndicator";
import { IconPdf, IconCheckCircle, IconEye, IconEyeOff } from "../../components/Icons";
import { get, post } from "../../api/index";
import { useAuth } from "../../context/AuthContext";
import { transliterateToGujarati } from "../../utils/gujaratiTransliterate";
import { checkCandidateImage, kbRange, PHOTO_SPEC, SIGNATURE_SPEC } from "../../utils/candidateImage";
import ImageRequirements from "../../components/ImageRequirements";
import UploadProgress from "../../components/UploadProgress";
import { uploadWithProgress } from "../../utils/uploadWithProgress";
import { CandidatePhoto, CandidateSignature } from "../../components/CandidateImage";

const API_BASE = import.meta.env.VITE_API_URL || "";

const TOTAL_STEPS = 10;
const PASSWORD_RE = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\|;'`~]).{8,}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CATEGORIES = ["General", "OBC", "SC", "ST", "EWS"];
const GENDERS = ["Male", "Female", "Other"];
const CERT_REQUIRED_CATS = new Set(["OBC", "SC", "ST", "EWS"]);
const DEFAULT_PORTAL_CONFIG = {
  uploadLimits: {
    photoMaxBytes: 250 * 1024,
    photoMaxLabel: "250 KB",
    signatureMaxBytes: 150 * 1024,
    signatureMaxLabel: "150 KB",
    documentMaxBytes: 2 * 1024 * 1024,
    documentMaxLabel: "2 MB",
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
  "casteCertFile", "casteCertPreview", "casteCertIsPdf", "casteCertUpload", "caste_cert_path",
  "udidCertUpload", "udid_cert_path",
  "photoUpload", "sigUpload",
  "photo_path", "signature_path", // only trusted from the server (resume)
  "photoFile", "photoPreview", "photoUploaded", "photoUploadedPreview", "photo_url",
  "sigFile", "sigPreview", "sigUploaded", "sigUploadedPreview", "signature_url",
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
  const navigate = useNavigate();
  const { refresh: refreshAuth } = useAuth();
  const [step, setStep] = useState(1);

  const [data, setData] = useState(() => loadPersistedData());
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  // Seconds before "Resend OTP" can be pressed again, and a note after a resend.
  const [resendIn, setResendIn] = useState(0);
  const [otpNotice, setOtpNotice] = useState("");
  const [deliveryChannel, setDeliveryChannel] = useState(null);
  const [detailsVerified, setDetailsVerified] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [registrationId, setRegId] = useState(null);
  const [sessionMissing, setSessionMissing] = useState(false);
  const [portalConfig, setPortalConfig] = useState(DEFAULT_PORTAL_CONFIG);
  const [qualifications, setQualifications] = useState([]);
  const [languages, setLanguages] = useState([]);

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
    get("/api/v1/languages/public")
      .then((res) => {
        const list = (res?.data || []).map((l) => l.name).filter(Boolean);
        setLanguages(list);
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
  const go = (n) => {
    setStep(Math.max(1, Math.min(n, TOTAL_STEPS)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  // Clear the file inputs' own stale selection/preview when leaving a step so
  // returning to it doesn't show a previous file's name/preview before a new pick.
  const back = (n) => {
    if (photoRef.current) photoRef.current.value = "";
    if (sigRef.current) sigRef.current.value = "";
    go(n);
  };

  // ── Auto-resume on mount: restore saved step & data from session ──
  useEffect(() => {
    get("/api/v1/candidates/register/resume")
      .then((res) => {
        if (res?.data?.data) {
          setData((p) => ({ ...p, ...res.data.data }));
          const savedStep = res.data?.step;
          if (savedStep && savedStep >= 1) {
            setStep(Math.min(savedStep + 1, TOTAL_STEPS));
          }
        }
      })
      .catch(() => {});
  }, []);

  // After a successful submit the server has already logged the candidate in.
  // This page is GuestOnly, so hydrating auth state while the success screen
  // is visible would redirect away and hide the registration ID — instead,
  // refresh on unmount, whichever way the user leaves.
  useEffect(() => {
    if (!registrationId || registrationId === "pending") return;
    return () => refreshAuth();
  }, [registrationId, refreshAuth]);

  // ── Session guard: steps 3+ require an active registration session ──
  useEffect(() => {
    if (step <= 2) return;
    get("/api/v1/candidates/register/resume")
      .then((res) => {
        if (res?.data?.data) setData((p) => ({ ...p, ...res.data.data }));
      })
      .catch(() => setSessionMissing(true));
  }, [step]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  // Send (or resend) the registration OTP. Stays on the OTP screen.
  const sendRegistrationOtp = async (isResend = false) => {
    setErrors({});
    setOtpNotice("");
    setLoading(true);
    try {
      const res = await post("/api/v1/otp/candidates/send", {
        mobile: data.mobile,
        aadhaar: data.aadhaar,
        email: data.email,
      });
      const returnedChannel = res?.data?.channel;
      const activeChannel = (returnedChannel && returnedChannel !== "dev")
        ? returnedChannel
        : (portalConfig?.otp?.primaryChannel || "email");
      setDeliveryChannel(activeChannel);
      setOtpSent(true);
      setOtp("");
      setResendIn(60);
      if (isResend) setOtpNotice("A new OTP has been sent. The earlier OTP no longer works. / નવો OTP મોકલવામાં આવ્યો છે.");
    } catch (err) {
      const msg = err.message || "Failed to send OTP.";
      if (msg.toLowerCase().includes("mobile") && msg.toLowerCase().includes("registered"))
        setErrors({ mobile: "This mobile number is already registered. Please login instead." });
      else setErrors({ _: msg });
    } finally { setLoading(false); }
  };

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

  // Files upload the moment they are picked, with a progress bar, so the
  // step's Continue button only moves on. `key` is the data field holding the
  // upload's state: { status: "uploading" | "done" | "error", pct, message, name, file }.
  const setUploadState = (key, patch) =>
    setData((p) => ({ ...p, [key]: { ...(p[key] || {}), ...patch } }));

  const sendFile = async (key, url, field, file, onDone) => {
    setUploadState(key, { status: "uploading", pct: 0, message: null, name: file.name, file });
    try {
      const fd = new FormData();
      fd.append(field, file);
      const json = await uploadWithProgress(url, fd, (pct) =>
        setData((p) => (p[key]?.file === file ? { ...p, [key]: { ...p[key], pct } } : p)),
      );
      setData((p) => {
        if (p[key]?.file !== file) return p; // a newer file was picked meanwhile
        return { ...p, ...(onDone ? onDone(p, json) : {}), [key]: { ...p[key], status: "done", pct: 100 } };
      });
    } catch (err) {
      if (err.message?.toLowerCase().includes("no registration")) setSessionMissing(true);
      setData((p) => (p[key]?.file === file ? { ...p, [key]: { ...p[key], status: "error", message: err.message } } : p));
    }
  };

  // Caste / UDID certificate: check size, preview, upload straight away.
  const DOCS = {
    caste: { file: "casteCertFile", preview: "casteCertPreview", pdf: "casteCertIsPdf", up: "casteCertUpload", url: "/api/v1/candidates/register/caste-cert", field: "caste_cert" },
    udid: { file: "udidCertFile", preview: "udidCertPreview", pdf: "udidCertIsPdf", up: "udidCertUpload", url: "/api/v1/candidates/register/udid-cert", field: "udid_cert" },
  };
  const pickDocument = (e, kind) => {
    const d = DOCS[kind];
    const file = e.target.files?.[0];
    if (!file) return;
    setErrors((p) => ({ ...p, [d.file]: undefined }));
    setData((p) => ({
      ...p,
      [d.file]: file,
      [d.preview]: URL.createObjectURL(file),
      [d.pdf]: file.type === "application/pdf",
    }));
    const max = portalConfig.uploadLimits.documentMaxBytes;
    if (file.size > max) {
      setUploadState(d.up, {
        status: "error", file: null, name: file.name,
        message: `File must be under ${portalConfig.uploadLimits.documentMaxLabel} (yours is ${formatBytes(file.size)}).`,
      });
      return;
    }
    sendFile(d.up, d.url, d.field, file);
  };
  const retryDocument = (kind) => {
    const d = DOCS[kind];
    const f = data[d.up]?.file;
    if (f) sendFile(d.up, d.url, d.field, f);
  };
  // Is the certificate stored? (uploaded now, or earlier in this registration)
  const docReady = (kind) => data[DOCS[kind].up]?.status === "done" || !!data[`${DOCS[kind].field}_path`];
  const docUploading = (kind) => data[DOCS[kind].up]?.status === "uploading";

  // Photo / signature: check against the rules (never altered), preview the
  // original, then upload straight away.
  const pickImage = async (e, field) => {
    const picked = e.target.files?.[0];
    const isPhoto = field === "photo";
    const fileKey = isPhoto ? "photoFile" : "sigFile";
    const previewKey = isPhoto ? "photoPreview" : "sigPreview";
    const upKey = isPhoto ? "photoUpload" : "sigUpload";
    if (!picked) return;
    try {
      const { previewUrl } = await checkCandidateImage(
        picked,
        isPhoto ? PHOTO_SPEC : SIGNATURE_SPEC,
        isPhoto ? "Photo" : "Signature",
      );
      setErrors({});
      setData((p) => ({ ...p, [fileKey]: picked, [previewKey]: previewUrl }));
      sendFile(
        upKey,
        isPhoto ? "/api/v1/candidates/register/photo" : "/api/v1/candidates/register/signature",
        field,
        picked,
        (p, json) =>
          isPhoto
            ? { photoUploaded: true, photoUploadedPreview: previewUrl, photo_url: json?.data?.url || null }
            : { sigUploaded: true, sigUploadedPreview: previewUrl, signature_url: json?.data?.url || null },
      );
    } catch (err) {
      e.target.value = "";
      setData((p) => ({ ...p, [fileKey]: undefined, [previewKey]: undefined, [upKey]: undefined }));
      setErrors({ [field]: err.message });
    }
  };
  const retryImage = (field) => {
    const isPhoto = field === "photo";
    const f = data[isPhoto ? "photoUpload" : "sigUpload"]?.file;
    if (!f) return;
    const previewUrl = data[isPhoto ? "photoPreview" : "sigPreview"];
    sendFile(isPhoto ? "photoUpload" : "sigUpload",
      isPhoto ? "/api/v1/candidates/register/photo" : "/api/v1/candidates/register/signature",
      field, f,
      (p, json) => isPhoto
        ? { photoUploaded: true, photoUploadedPreview: previewUrl, photo_url: json?.data?.url || null }
        : { sigUploaded: true, sigUploadedPreview: previewUrl, signature_url: json?.data?.url || null });
  };
  const imageReady = (field) => field === "photo"
    ? data.photoUpload?.status === "done" || (!data.photoUpload && (data.photoUploaded || data.photo_path))
    : data.sigUpload?.status === "done" || (!data.sigUpload && (data.sigUploaded || data.signature_path));

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
                    ફોટો: JPG/PNG, {kbRange(PHOTO_SPEC)}, {PHOTO_SPEC.minWidth}–{PHOTO_SPEC.maxWidth} px પહોળો × {PHOTO_SPEC.minHeight}–{PHOTO_SPEC.maxHeight} px ઊંચો (ઊભો, પાસપોર્ટ સાઇઝ), સફેદ પૃષ્ઠભૂમિ, સ્પષ્ટ ચહેરો.
                  </span>
                  <br />
                  <span style={{ fontSize: 12 }}>
                    (Photo: JPG/PNG, {kbRange(PHOTO_SPEC)}, {PHOTO_SPEC.minWidth}–{PHOTO_SPEC.maxWidth} px wide × {PHOTO_SPEC.minHeight}–{PHOTO_SPEC.maxHeight} px high, portrait passport size e.g. {PHOTO_SPEC.example}, white background, clear face.)
                  </span>
                </li>
                <li style={{ marginBottom: 6 }}>
                  <span style={{ fontFamily: "var(--font-guj)", fontSize: 14 }}>
                    સહી: JPG/PNG, {kbRange(SIGNATURE_SPEC)}, {SIGNATURE_SPEC.minWidth}–{SIGNATURE_SPEC.maxWidth} px પહોળી × {SIGNATURE_SPEC.minHeight}–{SIGNATURE_SPEC.maxHeight} px ઊંચી (આડી, આશરે 3 : 1), સફેદ કાગળ પર કાળી/વાદળી શાહી.
                  </span>
                  <br />
                  <span style={{ fontSize: 12 }}>
                    (Signature: JPG/PNG, {kbRange(SIGNATURE_SPEC)}, {SIGNATURE_SPEC.minWidth}–{SIGNATURE_SPEC.maxWidth} px wide × {SIGNATURE_SPEC.minHeight}–{SIGNATURE_SPEC.maxHeight} px high, landscape about 3 : 1 e.g. {SIGNATURE_SPEC.example}, black/blue ink on white paper.)
                  </span>
                </li>
                <li style={{ marginBottom: 6 }}>
                  <span style={{ fontFamily: "var(--font-guj)", fontSize: 14 }}>
                    ફોટો અને સહી જેમ અપલોડ કરશો તેમ જ વપરાશે — અપલોડ કરતાં પહેલાં જાતે સાઇઝ ગોઠવી રાખો.
                  </span>
                  <br />
                  <span style={{ fontSize: 12 }}>
                    (Photo and signature are used exactly as uploaded — resize them yourself and keep them ready before you start.)
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
                <label>Email Address *</label>
                <input
                  type="email"
                  value={data.email || ""}
                  onChange={set("email")}
                  placeholder="example@domain.com"
                  disabled={detailsVerified}
                />
                <FieldError msg={errors.email} />
              </div>
              <div className="form-field">
                <label>Create Password *</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={data.password || ""}
                    onChange={set("password")}
                    placeholder="Min 8 chars, 1 uppercase, 1 digit, 1 special"
                    disabled={detailsVerified}
                    style={{ paddingRight: 36, width: "100%" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    disabled={detailsVerified}
                    style={{
                      position: "absolute",
                      right: 8,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: detailsVerified ? "default" : "pointer",
                      padding: 0,
                      display: "flex",
                      color: "var(--ojas-ink-3)",
                    }}
                  >
                    {showPassword ? <IconEyeOff /> : <IconEye />}
                  </button>
                </div>
                <FieldError msg={errors.password} />
              </div>
              <div className="form-field">
                <label>Confirm Password *</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPasswordConfirm ? "text" : "password"}
                    value={data.passwordConfirm || ""}
                    onChange={set("passwordConfirm")}
                    placeholder="Re-enter password"
                    disabled={detailsVerified}
                    style={{ paddingRight: 36, width: "100%" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordConfirm((v) => !v)}
                    aria-label={showPasswordConfirm ? "Hide password" : "Show password"}
                    disabled={detailsVerified}
                    style={{
                      position: "absolute",
                      right: 8,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: detailsVerified ? "default" : "pointer",
                      padding: 0,
                      display: "flex",
                      color: "var(--ojas-ink-3)",
                    }}
                  >
                    {showPasswordConfirm ? <IconEyeOff /> : <IconEye />}
                  </button>
                </div>
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
                      if (!data.email || !EMAIL_RE.test(data.email)) e.email = "Enter a valid email address.";
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
                    onClick={() => sendRegistrationOtp(false)}
                  >
                    {loading ? "Sending OTP…" : "Send OTP"}
                  </button>
                </div>
              ) : (
                <>
                  <div className="form-field">
                    <label>
                      OTP (sent to {((deliveryChannel || portalConfig?.otp?.primaryChannel) === "email" && data.email) ? data.email : data.mobile}
                      {` via ${(deliveryChannel || portalConfig?.otp?.primaryChannel || "email").toUpperCase()}`}) *
                    </label>
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
                    {otpNotice && (
                      <p style={{ fontSize: 12.5, margin: "6px 0 0", color: "#2a7a2a", fontWeight: 600 }}>✓ {otpNotice}</p>
                    )}
                    <p style={{ fontSize: 12.5, margin: "8px 0 0", color: "var(--ojas-ink-3)" }}>
                      Didn't get it?{" "}
                      {resendIn > 0 ? (
                        <span>Resend in {resendIn}s</span>
                      ) : (
                        <button type="button" className="btn-link" disabled={loading} onClick={() => sendRegistrationOtp(true)}>
                          {loading ? "Sending…" : "Resend OTP"}
                        </button>
                      )}
                      {" · "}
                      <button type="button" className="btn-link" disabled={loading}
                        onClick={() => { setOtpSent(false); setOtp(""); setDeliveryChannel(null); setOtpNotice(""); setResendIn(0); setDetailsVerified(false); }}>
                        Change mobile / email
                      </button>
                    </p>
                  </div>
                  <div className="form-actions">
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
                  value={data.name || ""}
                  onChange={setName("name")}
                  maxLength={100}
                />
                <FieldError msg={errors.name} />
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
                      onChange={(e) => pickDocument(e, "caste")}
                    />
                    <UploadProgress state={data.casteCertUpload} onRetry={data.casteCertUpload?.file ? () => retryDocument("caste") : undefined} />
                    {!data.casteCertUpload && data.caste_cert_path && (
                      <p style={{ fontSize: 12.5, margin: "6px 0 0", color: "#2a7a2a", fontWeight: 600 }}>
                        ✓ Certificate already uploaded — choose a file only to replace it.
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
                    if (!data.name?.trim()) e.name = "Required";
                    if (!data.father_husband_name?.trim())
                      e.father_husband_name = "Required";
                    if (!data.dob) e.dob = "Required";
                    if (!data.gender) e.gender = "Required";
                    if (!data.category) e.category = "Required";
                    if (needsCasteCert) {
                      if (docUploading("caste"))
                        e.casteCertFile = "Please wait — the certificate is still uploading.";
                      else if (!docReady("caste"))
                        e.casteCertFile = data.casteCertUpload?.status === "error"
                          ? "The certificate did not upload. Please try again."
                          : "Please upload your caste certificate.";
                    }
                    if (Object.keys(e).length) {
                      setErrors(e);
                      return;
                    }

                    saveStep({
                      name: data.name,
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
              {isOthersQual && (
                <div className="form-field">
                  <label>Equivalent to / સમકક્ષ લાયકાત *</label>
                  <select
                    value={data.qualification_equivalent || ""}
                    onChange={set("qualification_equivalent")}
                  >
                    <option value="">Select the qualification yours is equal to…</option>
                    {qualifications.filter((q) => !isOthersQualification(q)).map((q) => (
                      <option key={q}>{q}</option>
                    ))}
                  </select>
                  <p style={{ fontSize: 11.5, margin: "2px 0 0", color: "var(--ojas-ink-3)" }}>
                    Used to check which posts you can apply for. Your certificate will be verified.
                  </p>
                  <FieldError msg={errors.qualification_equivalent} />
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
                      onChange={(e) => pickDocument(e, "udid")}
                    />
                    <UploadProgress state={data.udidCertUpload} onRetry={data.udidCertUpload?.file ? () => retryDocument("udid") : undefined} />
                    {!data.udidCertUpload && data.udid_cert_path && (
                      <p style={{ fontSize: 12.5, margin: "6px 0 0", color: "#2a7a2a", fontWeight: 600 }}>
                        ✓ Certificate already uploaded — choose a file only to replace it.
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
                    if (isOthersQual && !data.qualification_equivalent)
                      e.qualification_equivalent = "Required";
                    if (data.ph_status) {
                      if (docUploading("udid"))
                        e.udidCertFile = "Please wait — the certificate is still uploading.";
                      else if (!docReady("udid"))
                        e.udidCertFile = data.udidCertUpload?.status === "error"
                          ? "The certificate did not upload. Please try again."
                          : "Please upload your UDID certificate.";
                    }
                    if (Object.keys(e).length) {
                      setErrors(e);
                      return;
                    }

                    saveStep({
                      marital_status: data.marital_status,
                      qualification: finalQual,
                      qualification_equivalent: isOthersQual ? data.qualification_equivalent : "",
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
            <p style={{ fontSize: 12.5, color: "var(--ojas-ink-3)", margin: "0 0 12px" }}>
              Add each language you know and tick what you can do in it.
              <span style={{ fontFamily: "var(--font-guj)", display: "block" }}>
                તમે જાણતા હો તે દરેક ભાષા ઉમેરો અને તેમાં શું કરી શકો છો તે પસંદ કરો.
              </span>
            </p>
            {langs.map((lang, i) => (
              <div
                key={i}
                style={{
                  border: "1px solid var(--ojas-line)",
                  background: "#fff",
                  padding: "12px 14px",
                  marginBottom: 10,
                  position: "relative",
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "flex-end",
                  gap: "12px 20px",
                }}
              >
                <div className="form-field" style={{ flex: "1 1 220px", minWidth: 200 }}>
                  <label>Language {i + 1} / ભાષા {i + 1}{i === 0 ? " *" : ""}</label>
                  <select
                    value={lang.language}
                    onChange={(e) => updateLang(i, { language: e.target.value })}
                  >
                    <option value="">Select Language…</option>
                    {languages
                      // a language already chosen in another row is not offered again
                      .filter((l) => l === lang.language || !langs.some((o, j) => j !== i && o.language === l))
                      .map((l) => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                  </select>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {[
                    ["read", "Read", "વાંચી શકું"],
                    ["write", "Write", "લખી શકું"],
                    ["speak", "Speak", "બોલી શકું"],
                  ].map(([sk, en, gu]) => (
                    <label
                      key={sk}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "6px 12px",
                        border: `1px solid ${lang[sk] ? "var(--ojas-navy)" : "var(--ojas-line)"}`,
                        background: lang[sk] ? "rgba(31, 60, 136, 0.06)" : "#fff",
                        cursor: "pointer",
                        fontSize: 13,
                        lineHeight: 1.2,
                        userSelect: "none",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={!!lang[sk]}
                        onChange={(e) => updateLang(i, { [sk]: e.target.checked })}
                        style={{ width: 16, height: 16, margin: 0 }}
                      />
                      <span>
                        {en}
                        <span style={{ fontFamily: "var(--font-guj)", display: "block", fontSize: 11, color: "var(--ojas-ink-3)" }}>{gu}</span>
                      </span>
                    </label>
                  ))}
                </div>
                {i > 0 && (
                  <button
                    type="button"
                    title="Remove this language"
                    onClick={() =>
                      setData((p) => ({
                        ...p,
                        languages: langs.filter((_, j) => j !== i),
                      }))
                    }
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 10,
                      background: "none",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--ojas-red)",
                    }}
                  >
                    ✕ Remove / દૂર કરો
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              className="btn"
              style={{ fontSize: 12.5, marginBottom: 12 }}
              disabled={langs.length >= languages.length && languages.length > 0}
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
              + Add Another Language / બીજી ભાષા ઉમેરો
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
            <ImageRequirements spec={PHOTO_SPEC} title="Photo requirements / ફોટો માટેની શરતો" />
            <div style={{ marginTop: 12 }}>
              <input
                ref={photoRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                onChange={(e) => pickImage(e, "photo")}
              />
              <FieldError msg={errors.photo} />
              <UploadProgress state={data.photoUpload} onRetry={data.photoUpload?.file ? () => retryImage("photo") : undefined} />
              {(data.photoPreview || data.photoUploadedPreview || data.photo_url) && (
                <div style={{ marginTop: 10 }}>
                  <CandidatePhoto
                    src={data.photoPreview || data.photoUploadedPreview}
                    url={data.photo_url}
                    caption={imageReady("photo") ? "Uploaded photo" : "Preview"}
                  />
                </div>
              )}
            </div>
            <div className="form-actions" style={{ marginTop: 16 }}>
              <button className="btn" onClick={() => back(6)}>
                ← Back
              </button>
              <button
                className="btn primary"
                disabled={data.photoUpload?.status === "uploading"}
                onClick={() => {
                  if (imageReady("photo")) go(step + 1);
                  else setErrors({ photo: data.photoUpload?.status === "error"
                    ? "The photo did not upload. Please try again."
                    : "Please choose your photo." });
                }}
              >
                {data.photoUpload?.status === "uploading" ? `Uploading… ${data.photoUpload.pct || 0}%` : "Continue ▶"}
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
            <ImageRequirements spec={SIGNATURE_SPEC} title="Signature requirements / સહી માટેની શરતો" />
            <div style={{ marginTop: 12 }}>
              <input
                ref={sigRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                onChange={(e) => pickImage(e, "signature")}
              />
              <FieldError msg={errors.signature} />
              <UploadProgress state={data.sigUpload} onRetry={data.sigUpload?.file ? () => retryImage("signature") : undefined} />
              {(data.sigPreview || data.sigUploadedPreview || data.signature_url) && (
                <div style={{ marginTop: 10 }}>
                  <CandidateSignature
                    src={data.sigPreview || data.sigUploadedPreview}
                    url={data.signature_url}
                    caption={imageReady("signature") ? "Uploaded signature" : "Preview"}
                  />
                </div>
              )}
            </div>
            <div className="form-actions" style={{ marginTop: 16 }}>
              <button className="btn" onClick={() => back(7)}>
                ← Back
              </button>
              <button
                className="btn primary"
                disabled={data.sigUpload?.status === "uploading"}
                onClick={() => {
                  if (imageReady("signature")) go(step + 1);
                  else setErrors({ signature: data.sigUpload?.status === "error"
                    ? "The signature did not upload. Please try again."
                    : "Please choose your signature." });
                }}
              >
                {data.sigUpload?.status === "uploading" ? `Uploading… ${data.sigUpload.pct || 0}%` : "Continue ▶"}
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
            <div style={{ display: "flex", gap: 24, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 14 }}>
              <CandidatePhoto src={data.photoUploadedPreview} url={data.photo_url} caption="Photo" />
              <CandidateSignature src={data.sigUploadedPreview} url={data.signature_url} caption="Signature" />
            </div>
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
                  You are now logged in. Keep that ID safe — you will need it
                  for future logins.
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
                          name: data.name || "",
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
