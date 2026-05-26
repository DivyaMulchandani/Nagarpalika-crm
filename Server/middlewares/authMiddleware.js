const ADMIN_TIMEOUT_MS = 15 * 60 * 1000;
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
      return res
        .status(401)
        .json({
          isOk: false,
          status: 401,
          message: "Session invalid or expired",
        });
    }

    // Session inactivity timeout
    const isAdminRole = ADMIN_ROLES.has(sessionUser.role);
    const timeoutMs = isAdminRole ? ADMIN_TIMEOUT_MS : CANDIDATE_TIMEOUT_MS;
    if (
      req.session.lastActivity &&
      Date.now() - req.session.lastActivity > timeoutMs
    ) {
      req.session.destroy((err) => {
        if (err) console.error("[SESSION] Destroy error:", err.message);
      });
      res.clearCookie("sessionId");
      return res
        .status(401)
        .json({
          isOk: false,
          status: 401,
          message: "Session expired due to inactivity",
        });
    }
    req.session.lastActivity = Date.now();

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
