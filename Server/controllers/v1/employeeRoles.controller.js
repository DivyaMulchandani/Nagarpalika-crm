import mongoose from "mongoose";
import EmployeeRoles from "../../models/EmployeeRoles.js";

export const createEmployeeRoles = async (req, res) => {
  try {
    const { roleId, roles } = req.body;

    // Validate roles array to ensure proper structure for menuId and menuGroupId
    if (!Array.isArray(roles)) {
      return res.status(400).json({
        isOk: false,
        message: "Roles must be an array",
      });
    }

    // Process roles to ensure they have either menuId or menuGroupId
    const processedRoles = roles.map((role) => {
      // Create a new role object with the processed data
      return {
        menuId: role.menuId || null,
        menuGroupId: role.menuGroupId || null,
        read: role.read || false,
        write: role.write || false,
        delete: role.delete || false,
        edit: role.edit || false,
        print: role.print || false,
        mail: role.mail || false,
      };
    });

    const employeeRoles = await EmployeeRoles.create({
      roleId,
      roles: processedRoles,
    });

    return res.status(200).json({
      isOk: true,
      message: "Employee roles created successfully",
      data: employeeRoles,
    });
  } catch (error) {
    console.error("[error]", error);
    return res.status(500).json({
      isOk: false,
      message: error.message,
    });
  }
};

export const getEmployeeRoles = async (req, res) => {
  try {
    const { roleId } = req.params;

    if (
      !roleId ||
      roleId === "undefined" ||
      roleId === "null" ||
      roleId === "[object Object]" ||
      !mongoose.Types.ObjectId.isValid(roleId)
    ) {
      return res.status(200).json({
        isOk: true,
        message: "No roles assigned yet",
        data: [],
      });
    }

    const employeeRoles = await EmployeeRoles.find({ roleId });
    if (!employeeRoles || employeeRoles.length === 0) {
      return res.status(200).json({
        isOk: true,
        message: "No roles assigned yet",
        data: [],
      });
    }

    return res.status(200).json({
      isOk: true,
      data: employeeRoles,
    });
  } catch (error) {
    console.error("[error]", error);
    return res.status(500).json({
      isOk: false,
      message: error.message,
    });
  }
};

export const updateEmployeeRoles = async (req, res) => {
  try {
    // Get the ID parameter (which could be document _id or employeeId)
    const rawId = req.params.roleId || req.params.id || req.body.roleId;
    const id =
      typeof rawId === "object" && rawId !== null
        ? rawId._id || rawId.id
        : rawId;

    if (
      !id ||
      id === "undefined" ||
      id === "null" ||
      id === "[object Object]" ||
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      return res.status(400).json({
        isOk: false,
        message: "Invalid roleId provided",
      });
    }
    const { roles } = req.body;

    // Validate roles array
    if (!Array.isArray(roles)) {
      return res.status(400).json({
        isOk: false,
        message: "Roles must be an array",
      });
    }

    // Process roles to ensure they have either menuId or menuGroupId
    const processedRoles = roles.map((role) => {
      // Create a new role object with the processed data
      return {
        menuId: role.menuId || null,
        menuGroupId: role.menuGroupId || null,
        read: role.read || false,
        write: role.write || false,
        delete: role.delete || false,
        edit: role.edit || false,
        print: role.print || false,
        mail: role.mail || false,
      };
    });

    // Try to find by document ID first (to match the frontend's behavior)
    let employeeRoles = await EmployeeRoles.findByIdAndUpdate(
      id,
      { roles: processedRoles },
      { new: true },
    );

    // If not found by ID, try to find by roleId
    if (!employeeRoles) {
      employeeRoles = await EmployeeRoles.findOneAndUpdate(
        { roleId: id },
        { roles: processedRoles },
        { new: true },
      );
    }

    if (!employeeRoles) {
      return res.status(404).json({
        isOk: false,
        message: "Employee roles not found",
      });
    }

    return res.status(200).json({
      isOk: true,
      message: "Employee roles updated successfully",
      data: employeeRoles,
    });
  } catch (error) {
    console.error("[error]", error);
    return res.status(500).json({
      isOk: false,
      message: error.message,
    });
  }
};
