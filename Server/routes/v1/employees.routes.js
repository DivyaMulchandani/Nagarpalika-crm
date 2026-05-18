import express from "express";
import mongoose from "mongoose";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import {
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getEmployeeById,
  listAllEmployees,
  listEmployeesByParams,
  listAllEmployeesByDepartment,
  loginEmployee,
  getCurrentUser,
  resetPassword,
  logoutUser,
  verifySession,
} from "../../controllers/v1/employee.controller.js";
import {
  loginValidation,
  searchValidation,
  createEmployeeValidation,
  allowOnlyFields,
  allowedLoginFields,
  allowedEmployeeFields,
  allowedSearchFields
} from "../../middlewares/inputValidator.js";

const router = express.Router();

/**
 * @swagger
 * /employees:
 *   post:
 *     summary: Create a new employee
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateEmployee'
 *     responses:
 *       200:
 *         description: Employee created successfully
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/employees",
  authMiddleware(["ADMIN"]),
  createEmployee,
);

/**
 * @swagger
 * /employees:
 *   get:
 *     summary: List all employees
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of employees
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isOk:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Employee'
 */
router.get(
  "/employees",
  authMiddleware(["ADMIN", "EMPLOYEE"]),
  listAllEmployees,
);

/**
 * @swagger
 * /employees/{employeeId}:
 *   get:
 *     summary: Get employee by ID
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee ID
 *     responses:
 *       200:
 *         description: Employee details
 *       404:
 *         description: Employee not found
 */
router.get(
  "/employees/:employeeId",
  authMiddleware(["ADMIN", "EMPLOYEE"]),
  getEmployeeById,
);

/**
 * @swagger
 * /employees/{employeeId}:
 *   put:
 *     summary: Update employee
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateEmployee'
 *     responses:
 *       200:
 *         description: Employee updated successfully
 *       404:
 *         description: Employee not found
 */
router.put(
  "/employees/:employeeId",
  authMiddleware(["ADMIN"]),
  updateEmployee,
);

/**
 * @swagger
 * /employees/{employeeId}:
 *   delete:
 *     summary: Delete employee
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee ID
 *     responses:
 *       200:
 *         description: Employee deleted successfully
 *       404:
 *         description: Employee not found
 */
router.delete(
  "/employees/:employeeId",
  authMiddleware(["ADMIN"]),
  deleteEmployee,
);

/**
 * @swagger
 * /employees/search:
 *   post:
 *     summary: Search employees with pagination
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SearchParams'
 *     responses:
 *       200:
 *         description: Paginated list of employees
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 */
router.post(
  "/employees/search",
  authMiddleware(["ADMIN", "EMPLOYEE"]),
  listEmployeesByParams,
);

/**
 * @swagger
 * /employees/department/{departmentId}:
 *   post:
 *     summary: List all employees by department with pagination
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SearchParams'
 *     responses:
 *       200:
 *         description: Paginated list of employees by department
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 */
router.get(
  "/employees/department/:departmentId",
  authMiddleware(["ADMIN", "EMPLOYEE"]),
  listAllEmployeesByDepartment,
);

/**
 * @swagger
 * /employees/{employeeId}/reset-password:
 *   post:
 *     summary: Reset employee password
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               password:
 *                 type: string
 *                 description: New password
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       404:
 *         description: Employee not found
 */
router.post(
  "/employees/:employeeId/reset-password",
  authMiddleware(["ADMIN"]),
  resetPassword,
);

/**
 * @swagger
 * /auth/employee/login:
 *   post:
 *     summary: Employee login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Invalid credentials
 *       429:
 *         description: Too many login attempts
 */
// SECURITY: Rate limit + field whitelist + input validation on login
router.post(
  "/auth/employee/login",
  allowOnlyFields(allowedLoginFields),      // Reject unexpected fields
  loginValidation,                          // Validate & sanitize input
  loginEmployee
);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current logged-in user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user details
 *       401:
 *         description: Unauthorized
 */
router.get("/auth/me", authMiddleware(["ADMIN", "EMPLOYEE", "DOCTOR"]), getCurrentUser);

// ============ LOGOUT ROUTE ============

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout and invalidate session
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       401:
 *         description: Unauthorized
 */
router.post("/auth/logout", authMiddleware(["ADMIN", "EMPLOYEE", "DOCTOR"]), logoutUser);

/**
 * @swagger
 * /auth/verify-session:
 *   get:
 *     summary: Verify if session is valid
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Session is valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isOk:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     role:
 *                       type: string
 *       401:
 *         description: Session invalid or expired
 */
router.get("/auth/verify-session", authMiddleware(["ADMIN", "EMPLOYEE", "DOCTOR"]), verifySession);

/**
 * @swagger
 * /admin/auth/block:
 *   post:
 *     summary: Admin - Block a user account
 *     tags: [Admin - Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Account blocked successfully
 *       404:
 *         description: User not found
 */
router.post(
  "/admin/auth/block",
  authMiddleware(["ADMIN"]),
  async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
          isOk: false,
          message: "valid userId is required",
          status: 400,
        });
      }

      if (String(userId) === String(req.user?.id)) {
        return res.status(400).json({
          isOk: false,
          message: "Cannot block your own account",
          status: 400,
        });
      }

      const Employee = (await import("../../models/Employee.js")).default;
      const CompanyMaster = (await import("../../models/CompanyMaster.js")).default;

      let user = await Employee.findByIdAndUpdate(userId, { isActive: false });
      let userType = "Employee";

      if (!user) {
        const target = await CompanyMaster.findById(userId);
        if (target?.isSuperAdmin) {
          return res.status(403).json({
            isOk: false,
            message: "Cannot block superadmin",
            status: 403,
          });
        }
        user = await CompanyMaster.findByIdAndUpdate(userId, { isActive: false });
        userType = "Company";
      }

      if (!user) {
        return res.status(404).json({
          isOk: false,
          message: "User not found",
          status: 404,
        });
      }

      res.status(200).json({
        isOk: true,
        message: `${userType} account blocked successfully`,
        status: 200,
      });
    } catch (error) {
      console.error("Error blocking account:", error);
      res.status(500).json({
        isOk: false,
        message: error.message,
        status: 500,
      });
    }
  }
);

/**
 * @swagger
 * /admin/auth/unblock:
 *   post:
 *     summary: Admin - Unblock a user account
 *     tags: [Admin - Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Account unblocked successfully
 *       404:
 *         description: User not found
 */
router.post(
  "/admin/auth/unblock",
  authMiddleware(["ADMIN"]),
  async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
          isOk: false,
          message: "valid userId is required",
          status: 400,
        });
      }

      const Employee = (await import("../../models/Employee.js")).default;
      const CompanyMaster = (await import("../../models/CompanyMaster.js")).default;

      let user = await Employee.findByIdAndUpdate(userId, { isActive: true });
      let userType = "Employee";

      if (!user) {
        const target = await CompanyMaster.findById(userId);
        if (target?.isSuperAdmin) {
          return res.status(403).json({
            isOk: false,
            message: "Cannot modify superadmin",
            status: 403,
          });
        }
        user = await CompanyMaster.findByIdAndUpdate(userId, { isActive: true });
        userType = "Company";
      }

      if (!user) {
        return res.status(404).json({
          isOk: false,
          message: "User not found",
          status: 404,
        });
      }

      res.status(200).json({
        isOk: true,
        message: `${userType} account unblocked successfully`,
        status: 200,
      });
    } catch (error) {
      console.error("Error unblocking account:", error);
      res.status(500).json({
        isOk: false,
        message: error.message,
        status: 500,
      });
    }
  }
);

export default router;

