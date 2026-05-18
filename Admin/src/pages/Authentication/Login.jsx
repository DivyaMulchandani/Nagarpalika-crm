import React, { useContext, useState } from "react";
import { Input, Label, Button, Form } from "reactstrap";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import withRouter from "../../Components/Common/withRouter";
import { AuthContext } from "../../context/AuthContext";
import { MenuContext } from "../../context/MenuContext";
import vyarisMark from "../../assets/images/vyaris-mark.svg";
import vyarisWordmark from "../../assets/images/vyaris-wordmark.svg";
import {
    loginCompany,
    sendOtp,
    verifyOtp,
    resetPassword,
} from "../../api/auth.api";

const initialState = { email: "", password: "" };

// ── Vyaris auth-page styles, scoped via .vy-auth wrapper ────────────────
const vyAuthStyles = `
.vy-auth {
    display: flex;
    min-height: 100vh;
    background: var(--vy-bg-0, #F5F6F2);
    font-family: var(--vy-font-body);
    color: var(--vy-fg-1);
}
.vy-auth__hero {
    flex: 1 1 60%;
    background: var(--vy-ink, #0A0B0A);
    color: #F4F5F2;
    padding: 64px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    position: relative;
    overflow: hidden;
}
.vy-auth__hero::after {
    content: "";
    position: absolute;
    inset: auto 0 0 0;
    height: 1px;
    background: var(--vy-lime);
    box-shadow: 0 0 24px -2px var(--vy-lime);
}
.vy-auth__brand { display: flex; align-items: center; gap: 16px; }
.vy-auth__brand img { height: 28px; }
.vy-auth__hero-body { max-width: 560px; }
.vy-auth__eyebrow {
    font-family: var(--vy-font-display);
    font-weight: 600;
    font-size: 12px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #8E918A;
    display: inline-flex;
    align-items: center;
    gap: 10px;
}
.vy-auth__eyebrow::before {
    content: "";
    width: 8px; height: 8px;
    background: var(--vy-lime);
    display: inline-block;
}
.vy-auth__display {
    font-family: var(--vy-font-display);
    font-weight: 700;
    font-size: 56px;
    line-height: 1.02;
    letter-spacing: -0.025em;
    color: #F4F5F2;
    margin: 24px 0 24px 0;
}
.vy-auth__lede {
    font-family: var(--vy-font-body);
    font-size: 17px;
    line-height: 1.55;
    color: #C9CBC5;
    max-width: 520px;
}
.vy-auth__metric-row { display: flex; gap: 48px; }
.vy-auth__metric .num {
    font-family: var(--vy-font-display);
    font-weight: 700;
    font-size: 32px;
    color: #F4F5F2;
    font-feature-settings: "tnum" 1;
}
.vy-auth__metric .label {
    font-family: var(--vy-font-display);
    font-weight: 600;
    font-size: 11px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #8E918A;
}

.vy-auth__form-pane {
    flex: 0 0 480px;
    background: #FFFFFF;
    padding: 64px 56px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    border-left: 1px solid var(--vy-line-1);
}
.vy-auth__form-title {
    font-family: var(--vy-font-display);
    font-weight: 700;
    font-size: 28px;
    line-height: 1.18;
    letter-spacing: -0.015em;
    color: var(--vy-ink);
    margin: 8px 0 8px 0;
}
.vy-auth__form-sub {
    font-family: var(--vy-font-body);
    font-size: 14px;
    color: var(--vy-fg-2);
    margin-bottom: 32px;
}

.vy-auth label.form-label {
    font-family: var(--vy-font-display);
    font-weight: 600;
    font-size: 11px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--vy-fg-2);
    margin-bottom: 8px;
}
.vy-auth .form-control {
    background: #FFFFFF;
    border: 1px solid var(--vy-line-1);
    border-radius: 8px;
    padding: 0.65rem 0.875rem;
    font-family: var(--vy-font-body);
    font-size: 15px;
    color: var(--vy-ink);
    transition: border-color 120ms ease, box-shadow 120ms ease;
}
.vy-auth .form-control:focus {
    border-color: var(--vy-lime);
    box-shadow: 0 0 0 3px rgba(200, 255, 61, 0.25);
    outline: none;
}
.vy-auth .form-control.is-invalid {
    border-color: var(--vy-danger);
    box-shadow: none;
}

.vy-auth .vy-btn-primary {
    width: 100%;
    background: var(--vy-lime);
    color: var(--vy-ink);
    border: 1px solid var(--vy-lime);
    border-radius: 8px;
    padding: 0.7rem 1rem;
    font-family: var(--vy-font-display);
    font-weight: 700;
    font-size: 14px;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    transition: background 120ms ease, transform 80ms ease;
    box-shadow: none;
}
.vy-auth .vy-btn-primary:hover:not(:disabled) {
    background: var(--vy-lime-soft, #E7FF96);
    border-color: var(--vy-lime-soft, #E7FF96);
}
.vy-auth .vy-btn-primary:active:not(:disabled) { transform: scale(0.98); }
.vy-auth .vy-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

.vy-auth .vy-link {
    color: var(--vy-lime-700, #145c2e);
    text-decoration: none;
    font-weight: 600;
    font-size: 13px;
}
.vy-auth .vy-link:hover { text-decoration: underline; }
.vy-auth .vy-link.is-disabled { color: var(--vy-fg-3); pointer-events: none; }

.vy-auth .vy-eye-toggle {
    background: transparent;
    border: 0;
    padding: 0 12px;
    color: var(--vy-fg-2);
    position: absolute;
    right: 0; top: 0;
    height: 100%;
    display: flex;
    align-items: center;
    cursor: pointer;
}
.vy-auth .vy-eye-toggle:hover { color: var(--vy-ink); }

.vy-auth .vy-error {
    color: var(--vy-danger);
    font-size: 12px;
    margin: 6px 0 0 0;
    font-weight: 500;
}
.vy-auth .vy-meta {
    font-size: 12px;
    color: var(--vy-fg-2);
    margin-top: 6px;
}

@media (max-width: 1024px) {
    .vy-auth__form-pane { flex-basis: 420px; padding: 48px 36px; }
    .vy-auth__hero { padding: 48px; }
    .vy-auth__display { font-size: 44px; }
}
@media (max-width: 767px) {
    .vy-auth { flex-direction: column; }
    .vy-auth__hero { display: none; }
    .vy-auth__form-pane { flex: 1 1 auto; border-left: 0; padding: 32px 24px; }
}
`;

const Login = () => {
    const { fetchMenus } = useContext(MenuContext);
    const { setAdminData } = useContext(AuthContext);
    const navigate = useNavigate();
    const [values, setValues] = useState(initialState);
    const [formErrors, setFormErrors] = useState({});
    const [isSubmit, setIsSubmit] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [errEmail, setErrEmail] = useState(false);
    const [errPassword, setErrPassword] = useState(false);

    const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
    const [forgotPasswordStep, setForgotPasswordStep] = useState(1);
    const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [isLoginLoading, setIsLoginLoading] = useState(false);
    const [isSendOtpLoading, setIsSendOtpLoading] = useState(false);
    const [isResendOtpLoading, setIsResendOtpLoading] = useState(false);
    const [isVerifyOtpLoading, setIsVerifyOtpLoading] = useState(false);
    const [isResetPasswordLoading, setIsResetPasswordLoading] = useState(false);

    const [otpCountdown, setOtpCountdown] = useState(0);
    const [otpResendDisabled, setOtpResendDisabled] = useState(false);
    const timerRef = React.useRef(null);

    React.useEffect(() => {
        if (otpCountdown > 0) {
            timerRef.current = setInterval(() => {
                setOtpCountdown((prev) => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current);
                        setOtpResendDisabled(false);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [otpCountdown]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs
            .toString()
            .padStart(2, "0")}`;
    };

    const handleChange = (e) => {
        setValues({ ...values, [e.target.name]: e.target.value });
    };

    const validate = (vals) => {
        const errors = {};
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!vals.email) {
            errors.email = "Email is required.";
            setErrEmail(true);
        } else if (!regex.test(vals.email)) {
            errors.email = "Invalid email address.";
            setErrEmail(true);
        } else {
            setErrEmail(false);
        }
        if (!vals.password) {
            errors.password = "Password is required.";
            setErrPassword(true);
        } else {
            setErrPassword(false);
        }
        return errors;
    };

    const login = async (e) => {
        if (e) e.preventDefault();
        setIsSubmit(true);
        const errs = validate(values);
        setFormErrors(errs);
        if (Object.keys(errs).length > 0) return;

        setIsLoginLoading(true);
        try {
            const res = await loginCompany({
                email: values.email,
                password: values.password,
            });
            if (res.data?.isOk) {
                localStorage.setItem("role", res.data.role);
                setAdminData({ ...res.data.data });
                fetchMenus();
                navigate("/dashboard");
            } else {
                toast.error(res.data?.message || "Authentication failed.");
            }
        } catch (error) {
            console.error("Login error:", error);
            toast.error(
                error?.response?.data?.message ||
                    "An error occurred during login. Please try again."
            );
        } finally {
            setIsLoginLoading(false);
        }
    };

    const handleSendOTP = () => {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!forgotPasswordEmail || !regex.test(forgotPasswordEmail)) {
            toast.error("Please enter a valid email address.");
            return;
        }
        setIsSendOtpLoading(true);
        sendOtp({ email: forgotPasswordEmail })
            .then((res) => {
                setIsSendOtpLoading(false);
                if (res.data.isOk) {
                    toast.success("OTP sent to your email.");
                    setForgotPasswordStep(2);
                    setOtpResendDisabled(true);
                    setOtpCountdown(60);
                } else {
                    toast.error(res.data.message || "Failed to send OTP.");
                    if (res.data.remainingTime) {
                        setOtpResendDisabled(true);
                        setOtpCountdown(res.data.remainingTime);
                    }
                }
            })
            .catch((err) => {
                setIsSendOtpLoading(false);
                if (
                    err.response &&
                    err.response.status === 429 &&
                    err.response.data.remainingTime
                ) {
                    toast.error(err.message || "Please wait before requesting a new OTP.");
                    setOtpResendDisabled(true);
                    setOtpCountdown(err.response.data.remainingTime);
                } else {
                    toast.error(
                        err?.response?.data?.message ||
                            err.message ||
                            "Failed to send OTP."
                    );
                }
            });
    };

    const handleResendOTP = () => {
        if (otpResendDisabled) return;
        setIsResendOtpLoading(true);
        sendOtp({ email: forgotPasswordEmail })
            .then((res) => {
                setIsResendOtpLoading(false);
                if (res.data.isOk) {
                    toast.success("OTP resent to your email.");
                    setOtpResendDisabled(true);
                    setOtpCountdown(60);
                } else {
                    toast.error(res.data.message || "Failed to resend OTP.");
                    if (res.data.remainingTime) {
                        setOtpResendDisabled(true);
                        setOtpCountdown(res.data.remainingTime);
                    }
                }
            })
            .catch((err) => {
                setIsResendOtpLoading(false);
                if (
                    err.response &&
                    err.response.status === 429 &&
                    err.response.data.remainingTime
                ) {
                    toast.error(err.message || "Please wait before requesting a new OTP.");
                    setOtpResendDisabled(true);
                    setOtpCountdown(err.response.data.remainingTime);
                } else {
                    toast.error(err.message || "Failed to resend OTP.");
                }
            });
    };

    const handleVerifyOTP = () => {
        if (!otp || otp.length !== 6) {
            toast.error("Please enter a valid 6-digit OTP.");
            return;
        }
        setIsVerifyOtpLoading(true);
        verifyOtp({ email: forgotPasswordEmail, otp })
            .then((res) => {
                setIsVerifyOtpLoading(false);
                if (res.data.isOk) {
                    toast.success("OTP verified.");
                    setForgotPasswordStep(3);
                } else {
                    toast.error(res.data.message || "Invalid OTP.");
                }
            })
            .catch((err) => {
                setIsVerifyOtpLoading(false);
                toast.error(err.message || "Failed to verify OTP.");
            });
    };

    const handleResetPassword = () => {
        if (newPassword.length < 6) {
            toast.error("Password must be at least 6 characters.");
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error("Passwords don't match.");
            return;
        }
        setIsResetPasswordLoading(true);
        resetPassword({
            email: forgotPasswordEmail,
            otp,
            newPassword,
        })
            .then((res) => {
                setIsResetPasswordLoading(false);
                if (res.data.isOk) {
                    toast.success("Password reset successfully.");
                    setForgotPasswordMode(false);
                    setForgotPasswordStep(1);
                    setForgotPasswordEmail("");
                    setOtp("");
                    setNewPassword("");
                    setConfirmPassword("");
                } else {
                    toast.error(res.message || "Failed to reset password.");
                }
            })
            .catch((err) => {
                setIsResetPasswordLoading(false);
                toast.error(err.message || "Failed to reset password.");
            });
    };

    const handleBackToLogin = () => {
        setForgotPasswordMode(false);
        setForgotPasswordStep(1);
        setForgotPasswordEmail("");
        setOtp("");
        setNewPassword("");
        setConfirmPassword("");
    };

    document.title = "Sign in · Vyaris HMS";

    const renderLoginForm = () => (
        <Form onSubmit={login}>
            <div className="vy-auth__eyebrow">Sign in</div>
            <h1 className="vy-auth__form-title">Sign in to your clinic</h1>
            <p className="vy-auth__form-sub">
                Enter your credentials to open your dashboard.
            </p>

            <div className="mb-3">
                <Label htmlFor="email" className="form-label">Email</Label>
                <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@clinic.com"
                    onChange={handleChange}
                    value={values.email}
                    className={
                        errEmail && isSubmit ? "form-control is-invalid" : "form-control"
                    }
                />
                {isSubmit && formErrors.email && (
                    <p className="vy-error">{formErrors.email}</p>
                )}
            </div>

            <div className="mb-3">
                <Label htmlFor="password-input" className="form-label">Password</Label>
                <div className="position-relative">
                    <Input
                        id="password-input"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter password"
                        onChange={handleChange}
                        value={values.password}
                        className={
                            errPassword && isSubmit
                                ? "form-control is-invalid"
                                : "form-control pe-5"
                        }
                    />
                    <button
                        type="button"
                        className="vy-eye-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                        <i className={showPassword ? "ri-eye-off-fill" : "ri-eye-fill"}></i>
                    </button>
                </div>
                {isSubmit && formErrors.password && (
                    <p className="vy-error">{formErrors.password}</p>
                )}
            </div>

            <div className="mt-4">
                <Button
                    type="submit"
                    className="vy-btn-primary"
                    onClick={login}
                    disabled={isLoginLoading}
                >
                    {isLoginLoading ? (
                        <>
                            <span
                                className="spinner-border spinner-border-sm me-2"
                                role="status"
                                aria-hidden="true"
                            ></span>
                            Signing in…
                        </>
                    ) : (
                        "Sign in"
                    )}
                </Button>
            </div>
        </Form>
    );

    const renderForgotPasswordForm = () => {
        switch (forgotPasswordStep) {
            case 1:
                return (
                    <>
                        <div className="vy-auth__eyebrow">Reset</div>
                        <h1 className="vy-auth__form-title">Forgot password</h1>
                        <p className="vy-auth__form-sub">
                            We'll send a one-time code to your email.
                        </p>
                        <div className="mb-3">
                            <Label htmlFor="forgotPasswordEmail" className="form-label">Email</Label>
                            <Input
                                id="forgotPasswordEmail"
                                type="email"
                                placeholder="you@clinic.com"
                                value={forgotPasswordEmail}
                                onChange={(e) => setForgotPasswordEmail(e.target.value)}
                                disabled={isSendOtpLoading}
                                className="form-control"
                            />
                        </div>
                        <div className="mt-4">
                            <Button
                                type="button"
                                className="vy-btn-primary"
                                onClick={handleSendOTP}
                                disabled={isSendOtpLoading}
                            >
                                {isSendOtpLoading ? (
                                    <>
                                        <span
                                            className="spinner-border spinner-border-sm me-2"
                                            role="status"
                                            aria-hidden="true"
                                        ></span>
                                        Sending…
                                    </>
                                ) : (
                                    "Send OTP"
                                )}
                            </Button>
                        </div>
                        <div className="mt-3 text-center">
                            <a
                                href="#"
                                className="vy-link"
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleBackToLogin();
                                }}
                            >
                                ← Back to sign in
                            </a>
                        </div>
                    </>
                );
            case 2:
                return (
                    <>
                        <div className="vy-auth__eyebrow">Verify</div>
                        <h1 className="vy-auth__form-title">Enter your OTP</h1>
                        <p className="vy-auth__form-sub">
                            We sent a 6-digit code to {forgotPasswordEmail}.
                        </p>
                        <div className="mb-3">
                            <Label htmlFor="otp" className="form-label">OTP</Label>
                            <Input
                                id="otp"
                                type="text"
                                maxLength={6}
                                placeholder="123456"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                disabled={isVerifyOtpLoading}
                                className="form-control"
                            />
                            {otpCountdown > 0 && (
                                <p className="vy-meta">
                                    Resend available in {formatTime(otpCountdown)}
                                </p>
                            )}
                        </div>
                        <div className="mt-4">
                            <Button
                                type="button"
                                className="vy-btn-primary"
                                onClick={handleVerifyOTP}
                                disabled={isVerifyOtpLoading}
                            >
                                {isVerifyOtpLoading ? (
                                    <>
                                        <span
                                            className="spinner-border spinner-border-sm me-2"
                                            role="status"
                                            aria-hidden="true"
                                        ></span>
                                        Verifying…
                                    </>
                                ) : (
                                    "Verify OTP"
                                )}
                            </Button>
                        </div>
                        <div className="mt-3 d-flex justify-content-between">
                            <a
                                href="#"
                                className="vy-link"
                                onClick={(e) => {
                                    e.preventDefault();
                                    setForgotPasswordStep(1);
                                }}
                            >
                                ← Back
                            </a>
                            <a
                                href="#"
                                className={`vy-link ${
                                    otpResendDisabled || isResendOtpLoading
                                        ? "is-disabled"
                                        : ""
                                }`}
                                onClick={(e) => {
                                    e.preventDefault();
                                    if (!otpResendDisabled && !isResendOtpLoading) {
                                        handleResendOTP();
                                    }
                                }}
                            >
                                {isResendOtpLoading ? "Resending…" : "Resend OTP"}
                            </a>
                        </div>
                    </>
                );
            case 3:
                return (
                    <>
                        <div className="vy-auth__eyebrow">Reset</div>
                        <h1 className="vy-auth__form-title">Set a new password</h1>
                        <p className="vy-auth__form-sub">
                            Pick something at least 6 characters long.
                        </p>
                        <div className="mb-3">
                            <Label htmlFor="newPassword" className="form-label">New password</Label>
                            <Input
                                id="newPassword"
                                type="password"
                                placeholder="New password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                disabled={isResetPasswordLoading}
                                className="form-control"
                            />
                        </div>
                        <div className="mb-3">
                            <Label htmlFor="confirmPassword" className="form-label">Confirm password</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                placeholder="Confirm new password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                disabled={isResetPasswordLoading}
                                className="form-control"
                            />
                        </div>
                        <div className="mt-4">
                            <Button
                                type="button"
                                className="vy-btn-primary"
                                onClick={handleResetPassword}
                                disabled={isResetPasswordLoading}
                            >
                                {isResetPasswordLoading ? (
                                    <>
                                        <span
                                            className="spinner-border spinner-border-sm me-2"
                                            role="status"
                                            aria-hidden="true"
                                        ></span>
                                        Resetting…
                                    </>
                                ) : (
                                    "Reset password"
                                )}
                            </Button>
                        </div>
                    </>
                );
            default:
                return null;
        }
    };

    return (
        <>
            <style>{vyAuthStyles}</style>
            <div className="vy-auth">
                <aside className="vy-auth__hero">
                    <div className="vy-auth__brand">
                        <img
                            src={vyarisWordmark}
                            alt="Vyaris"
                            style={{ filter: "invert(1)" }}
                        />
                    </div>
                    <div className="vy-auth__hero-body">
                        <span className="vy-auth__eyebrow">Hospital management</span>
                        <h1 className="vy-auth__display">
                            Run the clinic.<br />
                            Skip the paperwork.
                        </h1>
                        <p className="vy-auth__lede">
                            Appointments, patients, billing and roles in one calm
                            mission-control surface. Built for Indian OPDs.
                        </p>
                    </div>
                    <div className="vy-auth__metric-row">
                        <div className="vy-auth__metric">
                            <div className="num">99.9%</div>
                            <div className="label">Uptime / 30D</div>
                        </div>
                        <div className="vy-auth__metric">
                            <div className="num">12ms</div>
                            <div className="label">Median lookup</div>
                        </div>
                        <div className="vy-auth__metric">
                            <div className="num">v1.0</div>
                            <div className="label">Release</div>
                        </div>
                    </div>
                </aside>

                <section className="vy-auth__form-pane">
                    <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 32 }}>
                        <img src={vyarisMark} alt="Vyaris mark" style={{ height: 32 }} />
                    </div>
                    {!forgotPasswordMode ? renderLoginForm() : renderForgotPasswordForm()}
                </section>
            </div>
        </>
    );
};

export default withRouter(Login);
