import CompanyMasterModels from "../../models/CompanyMaster.js";
import EmployeeModels from "../../models/Employee.js";
import bcrypt from "bcrypt";
import fs from "fs";
import path from "path";

export const createCompanyMaster = async (req, res) => {
  try {
    const {
      companyName,
      email,
      password,
      mobileNumber,
      gstNumber,
      countryId,
      stateId,
      cityId,
      address,
      pincode,
      website,
    } = req.body;

    if (!password || typeof password !== "string" || password.length < 8) {
      return res.status(400).json({
        isOk: false,
        status: 400,
        message: "Password must be at least 8 characters",
      });
    }

    if (!email || !companyName) {
      return res.status(400).json({
        isOk: false,
        status: 400,
        message: "companyName and email are required",
      });
    }

    const isAdmin = req.session?.user?.role === "ADMIN";
    if (!isAdmin) {
      const existingCount = await CompanyMasterModels.countDocuments({});
      if (existingCount > 0) {
        return res.status(401).json({
          isOk: false,
          status: 401,
          message: "Company already provisioned. Authentication required to create additional companies.",
        });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const companyMaster = new CompanyMasterModels({
      companyName,
      email,
      password: hashedPassword,
      mobileNumber,
      gstNumber,
      countryId,
      stateId,
      cityId,
      address,
      pincode,
      website,
      isActive: true,
      isSuperAdmin: isAdmin ? false : true,
    });

    // Handle file uploads
    if (req.files && req.files.logo) {
      companyMaster.logo = req.files.logo[0].path;
    }

    if (req.files && req.files.favicon) {
      companyMaster.favicon = req.files.favicon[0].path;
    }

    await companyMaster.save();

    return res.status(201).json({
      isOk: true,
      message: "Company Master created successfully",
    });
  } catch (error) {
    console.log("Error in createCompanyMaster", error);
    return res.status(500).json({
      isOk: false,
      message: error.message,
    });
  }
};

export const updateCompanyMaster = async (req, res) => {
  try {
    const companyId = req.params.id;
    const companyMaster = await CompanyMasterModels.findById(companyId);

    if (!companyMaster) {
      return res.status(404).json({
        isOk: false,
        message: "Company Master not found",
      });
    }

    const updateFields = [
      "companyName",
      "email",
      "contactPersonName",
      "contactNumber",
      "mobileNumber",
      "gstNumber",
      "countryId",
      "stateId",
      "cityId",
      "address",
      "pincode",
      "isActive",
    ];

    updateFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        companyMaster[field] = req.body[field];
      }
    });

    // Handle file updates
    if (req.files && req.files.logo) {
      if (companyMaster.logo) {
        const oldLogoPath = path.join(companyMaster.logo);
        if (fs.existsSync(oldLogoPath)) {
          fs.unlinkSync(oldLogoPath);
        }
      }
      companyMaster.logo = req.files.logo[0].path;
    }

    if (req.files && req.files.favicon) {
      if (companyMaster.favicon) {
        const oldFaviconPath = path.join(companyMaster.favicon);
        if (fs.existsSync(oldFaviconPath)) {
          fs.unlinkSync(oldFaviconPath);
        }
      }
      companyMaster.favicon = req.files.favicon[0].path;
    }

    await companyMaster.save();

    return res.status(200).json({
      isOk: true,
      message: "Company Master updated successfully",
    });
  } catch (error) {
    console.error("Error in updateCompanyMaster", error);
    return res.status(500).json({
      isOk: false,
      message: error.message,
    });
  }
};

export const loginCompany = async (req, res) => {
  try {
    const { email, password } = req.body;

    let user = null;
    let role = null;
    let userId = null;

    // Check all three user types
    const companyMaster = await CompanyMasterModels.findOne({
      email,
      isActive: true,
    })
      .populate("countryId")
      .populate("stateId")
      .populate("cityId")
      .exec();

    const employee = await EmployeeModels.findOne({
      emailOffice: email,
      isActive: true,
    })
      .populate("departmentId")
      .populate("stateId")
      .populate("cityId")
      .exec();

    if (companyMaster) {
      user = companyMaster;
      userId = companyMaster._id;
      role = "ADMIN";
    } else if (employee) {
      user = employee;
      userId = employee._id;
      role = "EMPLOYEE";
    }

    if (!user) {
      return res.status(404).json({
        isOk: false,
        message: "User not found",
        status: 404,
      });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        isOk: false,
        message: "Invalid email or password",
        error: "Invalid credentials",
        status: 401,
      });
    }

    const company = await CompanyMasterModels.findOne({ isSuperAdmin: false });

    const dataToSend = user.toObject ? user.toObject() : user;
    delete dataToSend.password;

    if (role === "EMPLOYEE") {
      dataToSend.companyName = company ? company.companyName : "";
    } else if (role === "DOCTOR") {
      dataToSend.companyName = company ? company.companyName : "";
    }

    // Store user data in express session
    req.session.user = {
      id: userId.toString(),
      role: role,
      email: user.email || user.emailOffice,
      name: user.companyName || user.employeeName || user.doctorName,
    };

    return res.status(200).json({
      isOk: true,
      message: "Login successful",
      data: dataToSend,
      role: role,
    });
  } catch (error) {
    console.error("Error in loginCompany:", error);
    return res.status(500).json({
      isOk: false,
      message: error.message,
      status: 500,
    });
  }
};

/**
 * Get current user details using session ID
 * No ID parameter needed - uses req.user.id from session middleware
 */
export const getCurrentUserDetails = async (req, res) => {
  try {
    const userId = req.user.id;

    let user = null;
    let role = null;

    const companyMaster = await CompanyMasterModels.findById(userId)
      .populate("countryId")
      .populate("stateId")
      .populate("cityId")
      .exec();

    const employee = await EmployeeModels.findById(userId)
      .populate("departmentId")
      .populate("countryId")
      .populate("stateId")
      .populate("cityId")
      .exec();

    if (companyMaster) {
      user = companyMaster;
      role = "ADMIN";
    } else if (employee) {
      user = employee;
      role = "EMPLOYEE";
    }

    if (!user) {
      return res.status(404).json({
        isOk: false,
        message: "User not found",
        status: 404,
      });
    }

    const company = await CompanyMasterModels.findOne({
      isSuperAdmin: false,
    });

    const dataToSend = user.toObject ? user.toObject() : { ...user };
    delete dataToSend.password;
    dataToSend.role = role;

    if (role === "EMPLOYEE" || role === "DOCTOR") {
      dataToSend.companyName = company ? company.companyName : "";
    }

    return res.status(200).json({
      isOk: true,
      data: dataToSend,
      role: role,
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
