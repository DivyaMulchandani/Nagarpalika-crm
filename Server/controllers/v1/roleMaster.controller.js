import RoleMaster from "../../models/RoleMaster.js";
import {
  getReferencingCounts,
  formatReferenceMessage,
} from "../../utils/referenceHelper.js";

export const createRole = async (req, res) => {
  try {
    const { roleName, isActive } = req.body;

    if (!roleName) {
      return res
        .status(400)
        .json({ isOk: false, message: "Role name is required" });
    }

    const newRole = new RoleMaster({
      roleName,
      isActive: isActive !== undefined ? isActive : true,
    });

    await newRole.save();
    res.status(201).json({ isOk: true, data: newRole });
  } catch (error) {
    console.error("Error creating role:", error);
    res.status(500).json({ isOk: false, message: "Internal server error" });
  }
};

export const listAllRoles = async (req, res) => {
  try {
    const roles = await RoleMaster.find({ isActive: true });
    res.status(200).json({ isOk: true, data: roles });
  } catch (error) {
    console.error("Error fetching roles:", error);
    res.status(500).json({ isOk: false, message: "Internal server error" });
  }
};

export const updateRole = async (req, res) => {
  try {
    const { roleId } = req.params;
    const { roleName, isActive } = req.body;

    if (!roleName) {
      return res
        .status(400)
        .json({ isOk: false, message: "Role name is required" });
    }

    const updatedRole = await RoleMaster.findByIdAndUpdate(
      roleId,
      { roleName, isActive },
      { new: true },
    );

    if (!updatedRole) {
      return res.status(404).json({ isOk: false, message: "Role not found" });
    }

    res.status(200).json({ isOk: true, data: updatedRole });
  } catch (error) {
    console.error("Error updating role:", error);
    res.status(500).json({ isOk: false, message: "Internal server error" });
  }
};

export const deleteRole = async (req, res) => {
  try {
    const { roleId } = req.params;

    const role = await RoleMaster.findById(roleId);
    if (!role) {
      return res.status(404).json({
        isOk: false,
        message: "Role not found",
        status: 404,
      });
    }

    const referenceInfo = await getReferencingCounts("RoleMaster", roleId);

    if (referenceInfo.totalReferences > 0) {
      return res.status(409).json({
        message: "Cannot delete role. It is being used by other records.",
        isOk: false,
        status: 409,
        totalReferences: referenceInfo.totalReferences,
        references: referenceInfo.details,
        formattedMessage: formatReferenceMessage(referenceInfo.details),
      });
    }

    await RoleMaster.findByIdAndDelete(roleId);

    res.status(200).json({
      isOk: true,
      message: "Role deleted successfully",
      status: 200,
    });
  } catch (error) {
    console.error("Error deleting role:", error);
    res.status(500).json({
      isOk: false,
      message: "Internal server error",
      status: 500,
      error: error.message,
    });
  }
};

export const getRoleById = async (req, res) => {
  try {
    const { roleId } = req.params;

    const role = await RoleMaster.findById(roleId);
    if (!role) {
      return res.status(404).json({ isOk: false, message: "Role not found" });
    }

    res.status(200).json({ isOk: true, data: role });
  } catch (error) {
    console.error("Error fetching role by ID:", error);
    res.status(500).json({ isOk: false, message: "Internal server error" });
  }
};

export const listRoleByParams = async (req, res) => {
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
      query = [
        {
          $match: {
            $or: [
              {
                roleName: {
                  $regex: match,
                  $options: "i",
                },
              },
            ],
          },
        },
      ].concat(query);
    }

    // Add sorting
    if (sorton && sortdir) {
      let sort = {};
      sort[sorton] = sortdir === "desc" ? -1 : 1;
      query = [{ $sort: sort }].concat(query);
    } else {
      query = [{ $sort: { createdAt: -1 } }].concat(query);
    }

    const list = await RoleMaster.aggregate(query);

    return res.status(200).json({
      isOk: true,
      data: list,
      status: 200,
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      isOk: false,
      message: error.message,
      status: 500,
    });
  }
};
