import MenuGroupMaster from "../../models/MenuGroupMaster.js";

export const createMenuGroup = async (req, res) => {
  try {
    const { menuGroupName, sequence, isActive, isLink, menuUrl } = req.body;
    console.log("Creating menu group:", req.body);

    const menuGroup = await MenuGroupMaster.create({
      menuGroupName,
      sequence,
      isActive,
      isLink: isLink || false,
      menuUrl: isLink ? menuUrl : "#",
      icon: req.body.icon || "",
    });

    res.status(201).json({
      isOk: true,
      message: "Menu Group created successfully",
      data: menuGroup,
    });
  } catch (error) {
    console.log("Error creating menu group:", error);
    res.status(500).json({
      isOk: false,
      message: "Error creating menu group",
      error: error.message,
    });
  }
};

export const getAllMenuGroups = async (req, res) => {
  try {
    const menuGroups = await MenuGroupMaster.find({ isActive: true });

    res.status(200).json({
      isOk: true,
      message: "Menu Groups fetched successfully",
      data: menuGroups,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      isOk: false,
      message: "Error fetching menu groups",
      error: error.message,
    });
  }
};

export const getMenuGroupById = async (req, res) => {
  try {
    const { menuGroupId } = req.params;

    const menuGroup = await MenuGroupMaster.findById(menuGroupId);

    res.status(200).json({
      isOk: true,
      message: "Menu Group fetched successfully",
      data: menuGroup,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      isOk: false,
      message: "Error fetching menu group",
      error: error.message,
    });
  }
};

export const updateMenuGroup = async (req, res) => {
  try {
    const { menuGroupId } = req.params;
    const { menuGroupName, sequence, isActive, isLink, menuUrl } = req.body;
    console.log("Updating menu group:", req.body);

    const menuGroup = await MenuGroupMaster.findByIdAndUpdate(
      menuGroupId,
      {
        menuGroupName,
        sequence,
        isActive,
        isLink: isLink || false,
        menuUrl: isLink ? menuUrl : "#",
        icon: req.body.icon || "",
      },
      { new: true },
    );

    res.status(200).json({
      isOk: true,
      message: "Menu Group updated successfully",
      data: menuGroup,
    });
  } catch (error) {
    console.log("Error updating menu group:", error);
    res.status(500).json({
      isOk: false,
      message: "Error updating menu group",
      error: error.message,
    });
  }
};

export const deleteMenuGroup = async (req, res) => {
  try {
    const { menuGroupId } = req.params;

    const menuGroup = await MenuGroupMaster.findByIdAndUpdate(
      menuGroupId,
      { isActive: false },
      { new: true },
    );

    res.status(200).json({
      isOk: true,
      message: "Menu Group deleted successfully",
      data: menuGroup,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      isOk: false,
      message: "Error deleting menu group",
      error: error.message,
    });
  }
};

export const listMenuGroupByParams = async (req, res) => {
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
                menuGroupName: {
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

    const list = await MenuGroupMaster.aggregate(query);

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
