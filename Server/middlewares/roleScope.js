/**
 * Role Scope Middleware
 * Injects scopedDepartmentId from session for department-scoped queries.
 * ADMIN sees all departments; DEPT_ADMIN sees own department only.
 */
export const roleScope = (req, res, next) => {
  if (req.user?.role === "DEPT_ADMIN") {
    req.scopedDepartmentId = req.user.departmentId ?? null;
  } else {
    req.scopedDepartmentId = null; // ADMIN / EMPLOYEE: no restriction
  }
  next();
};
