/**
 * Role Scope Middleware
 * Injects scopedDepartmentId for department-scoped advertisement changes.
 * ADMIN and ordinary employees see all departments; a department admin works on
 * their own department only.
 *
 * Every staff member logs in with the session role EMPLOYEE, so "department
 * admin" is read from the role assigned to them (Role Master), not the session.
 * Looked up on each request, so a role or department change applies at once.
 */
import Employee from "../models/Employee.js";

const DEPT_ADMIN = "DEPT_ADMIN";

export const roleScope = async (req, res, next) => {
  req.scopedDepartmentId = null; // no restriction unless shown otherwise below
  if (req.user?.role === "ADMIN") return next();

  try {
    let departmentId = req.user?.departmentId ?? null;
    let isDeptAdmin = req.user?.role === DEPT_ADMIN;

    if (req.user?.role === "EMPLOYEE") {
      const employee = await Employee.findById(req.user.id)
        .select("departmentId roleId")
        .populate("roleId", "roleName")
        .lean();
      isDeptAdmin =
        String(employee?.roleId?.roleName || "").trim().toUpperCase() === DEPT_ADMIN;
      departmentId = employee?.departmentId ?? null;
    }

    if (!isDeptAdmin) return next();
    // A department admin with no department must not fall through to "all".
    if (!departmentId)
      return res.status(403).json({
        isOk: false,
        status: 403,
        message: "No department is assigned to your account",
      });

    req.scopedDepartmentId = String(departmentId);
    return next();
  } catch (err) {
    console.error("[roleScope] lookup failed:", err.message);
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: "An unexpected error occurred" });
  }
};

/** Whether a department admin is trying to act on another department. */
export const outsideScope = (req, department) =>
  !!req.scopedDepartmentId &&
  String(department?._id ?? department ?? "") !== req.scopedDepartmentId;
