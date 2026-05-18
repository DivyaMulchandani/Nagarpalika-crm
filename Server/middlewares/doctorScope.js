/**
 * Doctor Scope Middleware
 * =======================
 * When the logged-in user is a DOCTOR, forces `req.doctorId` to the doctor's own ID,
 * ignoring any client-supplied doctorId. For other roles, reads doctorId from
 * query params or request body as usual.
 *
 * Usage: attach after authMiddleware on any route that should be doctor-scoped.
 */

export const doctorScope = (req, res, next) => {
  if (req.user?.role === "DOCTOR") {
    // Force scope to the logged-in doctor's own ID
    req.doctorId = req.user.id;
  } else {
    // For ADMIN/EMPLOYEE, allow optional doctorId from query or body
    req.doctorId = req.query?.doctorId || req.body?.doctorId || null;
  }
  next();
};
