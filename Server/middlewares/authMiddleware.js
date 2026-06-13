const ADMIN_TIMEOUT_MS = 8 * 60 * 60 * 1000;
const CANDIDATE_TIMEOUT_MS = 30 * 60 * 1000;
const ADMIN_ROLES = new Set(["ADMIN", "EMPLOYEE", "DEPT_ADMIN"]);

export const authMiddleware = (roles) => {
  return async (req, res, next) => {
    if (!req.session || !req.session.user) {
      res.clearCookie("sessionId");
      return res
        .status(401)
        .json({ isOk: false, status: 401, message: "Not logged in" });
    }

    const sessionUser = req.session.user;

    if (!sessionUser.id || !sessionUser.role) {
      res.clearCookie("sessionId");
      return res.status(401).json({
        isOk: false,
        status: 401,
        message: "Session invalid or expired",
      });
    }

    const isAdminRole = ADMIN_ROLES.has(sessionUser.role);

    if (isAdminRole) {
      // Admins: inactivity timeout (8h)
      if (
        req.session.lastActivity &&
        Date.now() - req.session.lastActivity > ADMIN_TIMEOUT_MS
      ) {
        req.session.destroy((err) => {
          if (err) console.error("[SESSION] Destroy error:", err.message);
        });
        res.clearCookie("sessionId");
        return res.status(401).json({
          isOk: false,
          status: 401,
          message: "Session expired due to inactivity",
        });
      }
      req.session.lastActivity = Date.now();
    } else {
      // Candidates: ABSOLUTE 30-minute session from login — activity and
      // page refreshes do not extend it (the frontend timer mirrors this).
      const loginAt = sessionUser.loginAt || sessionUser.lastActivity;
      if (!loginAt || Date.now() - loginAt > CANDIDATE_TIMEOUT_MS) {
        req.session.destroy((err) => {
          if (err) console.error("[SESSION] Destroy error:", err.message);
        });
        res.clearCookie("sessionId");
        return res.status(401).json({
          isOk: false,
          status: 401,
          message: "Session expired. Please log in again.",
        });
      }
    }

    // Admin IP whitelist
    if (isAdminRole) {
      const allowedIps = (process.env.ADMIN_ALLOWED_IPS || "")
        .split(",")
        .map((ip) => ip.trim())
        .filter(Boolean);
      if (allowedIps.length) {
        const clientIp = (req.ip || "").replace(/^::ffff:/, "");
        if (!allowedIps.includes(clientIp)) {
          return res
            .status(403)
            .json({ isOk: false, status: 403, message: "IP not permitted" });
        }
      }
    }

    // Role check
    if (roles && roles.length > 0 && !roles.includes(sessionUser.role)) {
      return res
        .status(403)
        .json({ isOk: false, status: 403, message: "Access denied" });
    }

    req.user = {
      id: sessionUser.id,
      role: sessionUser.role,
      email: sessionUser.email,
      name: sessionUser.name,
      registration_id: sessionUser.registration_id,
      departmentId: sessionUser.departmentId,
    };

    next();
  };
};
