import { createContext, useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUserDetails } from "../api/companies.api";
import { verifySession } from "../api/auth.api";


const AuthContext = createContext();

const AuthProvider = ({ children }) => {
    const [adminData, setAdminData] = useState(null);
    const [loading, setLoading] = useState(true); // Start with loading true for session verification
    const [role, setRole] = useState(localStorage.getItem("role") || null);
    const [isSessionVerified, setIsSessionVerified] = useState(false);

    const navigate = useNavigate();

    // Fetch admin/user data using the session (no ID needed)
    const getAdmin = useCallback(() => {
        setLoading(true);
        getCurrentUserDetails()
            .then((res) => {
                setAdminData(res.data.data);
            })
            .catch((error) => {
                if (error.response?.status === 401 || error.response?.status === 403) {
                    localStorage.removeItem("role");
                    setAdminData(null);
                    setRole(null);
                    navigate("/");
                }
            })
            .finally(() => {
                setLoading(false);
            });
    }, [navigate]);

    // Verify session on page load/refresh
    const verifyUserSession = useCallback(async () => {
        try {
            const res = await verifySession();
            if (res.data.isOk) {
                setRole(res.data.data.role);
                localStorage.setItem("role", res.data.data.role);
                setIsSessionVerified(true);
                getAdmin();
            } else {
                localStorage.removeItem("role");
                setAdminData(null);
                setRole(null);
                setIsSessionVerified(true);
                setLoading(false);
                navigate("/");
            }
        } catch (error) {
            // Session is invalid — clear state and redirect to login
            localStorage.removeItem("role");
            setAdminData(null);
            setRole(null);
            setIsSessionVerified(true);
            setLoading(false);
            navigate("/");
        }
    }, [navigate, getAdmin]);

    // Verify session on mount
    useEffect(() => {
        verifyUserSession();
    }, [verifyUserSession]);

    // Heartbeat: ping server every 30 minutes so the session stays alive
    useEffect(() => {
        if (!role) return;
        const interval = setInterval(async () => {
            try {
                await verifySession();
            } catch {
                // Session expired — the 401 interceptor will handle redirect
            }
        }, 30 * 60 * 1000);
        return () => clearInterval(interval);
    }, [role]);

    return (
        <AuthContext.Provider value={{ adminData, setAdminData, getAdmin, role, setRole, loading, setLoading, isSessionVerified }}>
            {children}
        </AuthContext.Provider>
    );
};

export { AuthContext, AuthProvider };

