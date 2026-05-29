import EmployeeModels from "../../models/Employee.js";
import CompanyMaster from "../../models/CompanyMaster.js";
import mongoose from "mongoose";
import bcrypt from "bcrypt";

export const createEmployee = async (req, res) => {
  try {
    const {
      employeeName,
      departmentId,
      roleId,
      emailOffice,
      mobileNumber,
      countryId,
      stateId,
      cityId,
      address,
      password,
      isActive,
    } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const existingEmployee = await EmployeeModels.findOne({
      emailOffice: emailOffice,
    });

    if (existingEmployee) {
      return res
        .status(400)
        .json({ isOk: false, message: "Employee already exists" });
    }

    const employee = new EmployeeModels({
      employeeName,
      departmentId,
      roleId,
      emailOffice,
      mobileNumber,
      countryId,
      stateId,
      cityId,
      address,
      password: hashedPassword,
      isActive,
    });

    await employee.save();

    return res.status(201).json({
      isOk: true,
      message: "Employee created successfully",
      status: 201,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      isOk: false,
      message: error.message,
      status: 500,
    });
  }
};

export const updateEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const {
      employeeName,
      departmentId,
      roleId,
      emailOffice,
      mobileNumber,
      countryId,
      stateId,
      cityId,
      address,
      isActive,
    } = req.body;

    const employee = await EmployeeModels.findById(employeeId);

    if (!employee) {
      return res.status(400).json({
        isOk: false,
        message: "Employee not found",
        status: 400,
      });
    }

    const existingEmployee = await EmployeeModels.findOne({
      emailOffice: emailOffice,
      _id: { $ne: employeeId },
    });

    if (existingEmployee) {
      return res.status(400).json({
        isOk: false,
        message: "Email already exists",
        status: 400,
      });
    }

    employee.employeeName = employeeName;
    employee.departmentId = departmentId;
    employee.roleId = roleId;
    employee.emailOffice = emailOffice;
    employee.mobileNumber = mobileNumber;
    employee.countryId = countryId;
    employee.stateId = stateId;
    employee.cityId = cityId;
    employee.address = address;
    employee.isActive = isActive;

    await employee.save();

    return res.status(200).json({
      isOk: true,
      message: "Employee updated successfully",
      status: 200,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      isOk: false,
      message: error.message,
      status: 500,
    });
  }
};

export const deleteEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const employee = await EmployeeModels.findById(employeeId);

    if (!employee) {
      return res.status(404).json({
        isOk: false,
        message: "Employee not found",
        status: 404,
      });
    }

    await EmployeeModels.findByIdAndDelete(employeeId).exec();

    return res.status(200).json({
      isOk: true,
      message: "Employee deleted successfully",
      status: 200,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      isOk: false,
      message: error.message,
      status: 500,
    });
  }
};

export const getEmployeeById = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const employee = await EmployeeModels.findById(employeeId)
      .populate("departmentId")
      .populate("countryId")
      .populate("stateId")
      .populate("cityId")
      .populate("roleId");

    if (!employee) {
      return res.status(404).json({
        isOk: false,
        message: "Employee not found",
        status: 404,
      });
    }

    return res.status(200).json({
      isOk: true,
      data: employee,
      status: 200,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      isOk: false,
      message: error.message,
      status: 500,
    });
  }
};

export const listAllEmployees = async (req, res) => {
  try {
    const employees = await EmployeeModels.find({
      isActive: true,
    })
      .populate("departmentId")
      .populate("countryId")
      .populate("stateId")
      .populate("cityId")
      .populate("roleId");

    return res.status(200).json({
      isOk: true,
      data: employees,
      status: 200,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      isOk: false,
      message: error.message,
      status: 500,
    });
  }
};

export const listEmployeesByParams = async (req, res) => {
  try {
    let { skip, per_page, sorton, sortdir, match, isActive } = req.body;

    // Build the initial match condition
    let matchCondition = {};
    if (isActive !== undefined && isActive !== null && isActive !== "") {
      matchCondition.isActive = isActive;
    }

    let query = [
      {
        $match: matchCondition,
      },
      {
        $lookup: {
          from: "departments",
          localField: "departmentId",
          foreignField: "_id",
          as: "department",
        },
      },
      {
        $unwind: {
          path: "$department",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "rolemasters",
          localField: "roleId",
          foreignField: "_id",
          as: "role",
        },
      },
      {
        $unwind: {
          path: "$role",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $facet: {
          stage1: [
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
              },
            },
          ],
          stage2: [{ $skip: skip }, { $limit: per_page }],
        },
      },
      {
        $unwind: "$stage1",
      },
      {
        $project: {
          count: "$stage1.count",
          data: "$stage2",
        },
      },
    ];

    if (match) {
      let searchConditions = {
        $or: [
          { employeeName: { $regex: match, $options: "i" } },
          { emailOffice: { $regex: match, $options: "i" } },
          { mobileNumber: { $regex: match, $options: "i" } },
          {
            "department.departmentName": {
              $regex: match,
              $options: "i",
            },
          },
        ],
      };

      if (mongoose.Types.ObjectId.isValid(match)) {
        searchConditions.$or.push(
          { departmentId: new mongoose.Types.ObjectId(match) },
          { roleId: new mongoose.Types.ObjectId(match) },
        );
      }

      query = [{ $match: searchConditions }].concat(query);
    }

    if (sorton && sortdir) {
      let sort = {};
      sort[sorton] = sortdir === "desc" ? -1 : 1;
      query = [{ $sort: sort }].concat(query);
    } else {
      query = [{ $sort: { createdAt: -1 } }].concat(query);
    }

    const list = await EmployeeModels.aggregate(query);

    return res.status(200).json({
      data: list,
      status: 200,
    });
  } catch (error) {
    console.error("Error in listEmployeesByParams:", error);
    return res.status(500).json({
      isOk: false,
      message: error.message,
      status: 500,
    });
  }
};

export const listAllEmployeesByDepartment = async (req, res) => {
  try {
    const { departmentId } = req.params;

    console.log(departmentId);

    const employees = await EmployeeModels.find({
      departmentId,
      isActive: true,
    });

    return res.status(200).json({
      isOk: true,
      data: employees,
      status: 200,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      isOk: false,
      message: error.message,
      status: 500,
    });
  }
};

export const loginEmployee = async (req, res) => {
  try {
    const { email, password } = req.body;

    const employee = await EmployeeModels.findOne({ emailOffice: email })
      .populate("departmentId")
      .populate("countryId")
      .populate("stateId")
      .populate("cityId")
      .populate("roleId")
      .exec();

    if (!employee) {
      return res.status(401).json({
        isOk: false,
        message: "Invalid credentials",
        status: 401,
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, employee.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        isOk: false,
        message: "Invalid credentials",
        error: "Invalid credentials",
        status: 401,
      });
    }

    // Store user data in express session (in-memory)
    req.session.user = {
      id: employee._id.toString(),
      role: "EMPLOYEE",
      email: employee.emailOffice,
      name: employee.employeeName,
    };

    return res.status(200).json({
      isOk: true,
      message: "Login successful",
      data: employee,
      status: 200,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      isOk: false,
      message: error.message,
      status: 500,
    });
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    // The user ID is available in req.user.id from the auth middleware
    const userId = req.user.id;
    let role = null;

    if (!userId) {
      return res.status(400).json({
        isOk: false,
        message: "User ID not found in request",
      });
    }

    let user = null;
    user = await EmployeeModels.findById(userId);
    if (user) {
      role = "EMPLOYEE";
    }

    if (!user) {
      user = await CompanyMaster.findById(userId);
      if (user) {
        role = "ADMIN";
      }
    }

    // DOCTOR role removed — recruitment portal uses ADMIN / EMPLOYEE / DEPT_ADMIN only

    if (!user) {
      return res.status(404).json({
        isOk: false,
        message: "User not found",
      });
    }

    const dataToSend = {
      _id: user._id,
      employeeName: user.employeeName || user.doctorName,
      emailOffice: user.emailOffice || user.email,
      role: role,
      isActive: user.isActive,
      departmentId: user.departmentId,
      roleId: user.roleId,
    };

    if (role === "DOCTOR") {
      dataToSend.doctorName = user.doctorName;
    }

    const company = await CompanyMaster.findOne({ isSuperAdmin: false });

    if (role === "EMPLOYEE" || role === "DOCTOR") {
      dataToSend.companyName = company ? company.companyName : "";
    }

    // Return essential user information
    return res.status(200).json({
      isOk: true,
      message: "User details retrieved successfully",
      data: dataToSend,
    });
  } catch (error) {
    console.error("Error fetching current user:", error);
    return res.status(500).json({
      isOk: false,
      message: error.message || "Error retrieving user details",
    });
  }
};
export const logoutUser = async (req, res) => {
  try {
    // Destroy the express session
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err);
        return res.status(500).json({
          isOk: false,
          message: "Logout failed",
          status: 500,
        });
      }

      // Clear the session cookie
      res.clearCookie('sessionId');

      return res.status(200).json({
        isOk: true,
        message: "Logged out successfully",
        status: 200,
      });
    });
  } catch (error) {
    console.error("Error during logout:", error);
    return res.status(500).json({
      isOk: false,
      message: "Logout failed",
      status: 500,
    });
  }
}

/**
 * Verify session - lightweight endpoint to check if session is valid
 * Returns only the user role, no sensitive data
 */
export const verifySession = async (req, res) => {
  return res.status(200).json({
    isOk: true,
    data: {
      role: req.user.role,
    },
  });
};

export const resetPassword = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { password } = req.body;

    const employee = await EmployeeModels.findById(employeeId);

    if (!employee) {
      return res.status(400).json({
        isOk: false,
        message: "Employee not found",
        status: 400,
      });
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    employee.password = hashedPassword;

    await employee.save();

    return res.status(200).json({
      isOk: true,
      message: "Password reset successfully",
      status: 200,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      isOk: false,
      message: error.message,
      status: 500,
    });
  }
};
