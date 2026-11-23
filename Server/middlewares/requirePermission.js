/**
 * Server-side page permissions.
 *
 * The role an employee is given (Admin Roles page) grants read/write/edit/delete
 * per menu, and the admin app hides buttons accordingly — but hiding a button
 * stops nobody calling the API directly. These guards apply the same grants on
 * the server. Permissions are named by the menu's URL, the same key the admin
 * app looks them up by (MenuContext.findMenuIdByUrl).
 *
 * Fails closed: an inactive employee, a role with no grants, or a menu that
 * doesn't exist all mean no access. Grants are read on every request, so
 * changing a role or deactivating an employee takes effect immediately.
 */
import Employee from "../models/Employee.js";
import EmployeeRoles from "../models/EmployeeRoles.js";
import MenuMaster from "../models/MenuMaster.js";
import MenuGroupMaster from "../models/MenuGroupMaster.js";

const toList = (v) => (Array.isArray(v) ? v : [v]);

const denied = (res) =>
  res.status(403).json({
    isOk: false,
    status: 403,
    message: "You do not have permission to do this",
  });

const failed = (res, err) => {
  console.error("[permission] check failed:", err.message);
  return res
    .status(500)
    .json({ isOk: false, status: 500, message: "An unexpected error occurred" });
};

const activeEmployee = (userId) =>
  Employee.findById(userId).select("roleId isActive").lean();

const granted = async (employee, menuUrls, actions) => {
  if (!employee?.isActive || !employee.roleId) return false;

  const [assigned, menus, groups] = await Promise.all([
    EmployeeRoles.findOne({ roleId: employee.roleId }).lean(),
    MenuMaster.find({ menuUrl: { $in: menuUrls } }).select("_id").lean(),
    // Direct-link menus (Dashboard) are stored as a group, not a menu.
    MenuGroupMaster.find({ menuUrl: { $in: menuUrls } }).select("_id").lean(),
  ]);
  if (!assigned) return false;

  const ids = new Set([...menus, ...groups].map((m) => String(m._id)));
  return (assigned.roles || []).some(
    (r) =>
      (ids.has(String(r.menuId)) || ids.has(String(r.menuGroupId))) &&
      actions.some((action) => r[action] === true),
  );
};

/**
 * @param {string|string[]} menuUrls Passing any one of these menus is enough.
 * @param {string|string[]} actions  read | write | edit | delete; any one is enough.
 *
 * Goes after authMiddleware, which has already decided who may reach the route.
 * ADMIN has every permission. A candidate only reaches a guarded route where
 * authMiddleware admits them (their own documents and receipts), and those
 * controllers do their own ownership check.
 */
export const requirePermission = (menuUrls, actions) => {
  const urls = toList(menuUrls);
  const wanted = toList(actions);
  return async function permissionGuard(req, res, next) {
    if (req.user?.role === "ADMIN" || req.user?.role === "CANDIDATE") return next();
    try {
      const employee = await activeEmployee(req.user?.id);
      return (await granted(employee, urls, wanted)) ? next() : denied(res);
    } catch (err) {
      return failed(res, err);
    }
  };
};

/**
 * The same check, for a controller that shows or hides part of a response
 * rather than refusing the whole request. ADMIN always passes.
 */
export const hasPermission = async (req, menuUrls, actions) => {
  if (req.user?.role === "ADMIN") return true;
  const employee = await activeEmployee(req.user?.id);
  return granted(employee, toList(menuUrls), toList(actions));
};

/**
 * For the permission list itself: every employee's own role has to load (the
 * sidebar is built from it), but reading anyone else's needs the permission.
 */
export const requireOwnRoleOrPermission = (menuUrls, actions) => {
  const urls = toList(menuUrls);
  const wanted = toList(actions);
  return async function ownRoleGuard(req, res, next) {
    if (req.user?.role === "ADMIN") return next();
    try {
      const employee = await activeEmployee(req.user?.id);
      if (employee?.isActive && String(employee.roleId) === req.params.roleId)
        return next();
      return (await granted(employee, urls, wanted)) ? next() : denied(res);
    } catch (err) {
      return failed(res, err);
    }
  };
};

/**
 * Nobody but ADMIN may change the grants of the role they hold themselves, or
 * "edit" on Admin Roles would let an employee hand themselves everything.
 * `id` is what the role update accepts: a role id or an EmployeeRoles id.
 */
export const isOwnRole = async (req, id) => {
  if (req.user?.role === "ADMIN") return false;
  const employee = await activeEmployee(req.user?.id);
  if (!employee?.roleId) return true;
  if (String(employee.roleId) === String(id)) return true;
  const doc = await EmployeeRoles.findById(id).select("roleId").lean();
  return !!doc && String(doc.roleId) === String(employee.roleId);
};
