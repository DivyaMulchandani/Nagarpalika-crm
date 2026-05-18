import EmailForModels from "../../models/EmailFor.js";
import EmailTemplateModels from "../../models/EmailTemplate.js";

export const createEmailFor = async (req, res) => {
  try {
    const { emailFor, isActive } = req.body;

    const existingEmailFor = await EmailForModels.findOne({ emailFor });

    if (existingEmailFor) {
      return res.status(409).json({
        isOk: false,
        status: 409,
        message: "Email For already exists",
      });
    }

    const emailForData = new EmailForModels({
      emailFor,
      isActive,
    });

    await emailForData.save();

    return res.status(201).json({
      status: 201,
      isOk: true,
      message: "Email For created successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      isOk: false,
      status: 500,
      message: "Internal server error",
      error: error,
    });
  }
};

export const updateEmailFor = async (req, res) => {
  try {
    const { emailForId } = req.params;

    const { emailFor, isActive } = req.body;

    const emailForData = await EmailForModels.findById(emailForId);

    if (!emailForData) {
      return res.status(404).json({
        isOk: false,
        status: 404,
        message: "Email For not found",
      });
    }

    const existingEmailFor = await EmailForModels.findOne({
      emailFor,
      _id: { $ne: emailForId },
    });

    if (existingEmailFor) {
      return res.status(409).json({
        isOk: false,
        status: 409,
        message: "Email For already exists",
      });
    }

    emailForData.emailFor = emailFor;
    emailForData.isActive = isActive;

    await emailForData.save();

    return res.status(200).json({
      status: 200,
      isOk: true,
      message: "Email For updated successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      isOk: false,
      status: 500,
      message: "Internal server error",
      error: error,
    });
  }
};

export const getEmailForById = async (req, res) => {
  try {
    const { emailForId } = req.params;

    const emailForData = await EmailForModels.findById(emailForId);

    if (!emailForData) {
      return res.status(404).json({
        isOk: false,
        status: 404,
        message: "Email For not found",
      });
    }

    return res.status(200).json({
      status: 200,
      isOk: true,
      data: emailForData,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      isOk: false,
      status: 500,
      message: "Internal server error",
      error: error,
    });
  }
};

export const listAllEmailFor = async (req, res) => {
  try {
    const emailForData = await EmailForModels.find({ isActive: true });

    return res.status(200).json({
      status: 200,
      isOk: true,
      data: emailForData,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      isOk: false,
      status: 500,
      message: "Internal server error",
      error: error,
    });
  }
};

export const deleteEmailFor = async (req, res) => {
  try {
    const { emailForId } = req.params;
    console.log(emailForId);

    const emailForData = await EmailForModels.findById(emailForId);

    if (!emailForData) {
      return res.status(404).json({
        isOk: false,
        status: 404,
        message: "Email For not found",
      });
    }

    const dependantTemplate = await EmailTemplateModels.find({
      emailFor: emailForData._id,
    });

    if (dependantTemplate.length > 0) {
      return res.status(400).json({
        isOk: false,
        status: 400,
        message:
          "Email for is being used in Email Template. Either Delete or change the Email For Field in the Template.",
      });
    }

    await EmailForModels.findByIdAndDelete(emailForId);

    return res.status(200).json({
      status: 200,
      isOk: true,
      message: "Email For deleted successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      isOk: false,
      status: 500,
      message: "Internal server error",
      error: error,
    });
  }
};

export const listEmailForByParams = async (req, res) => {
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
                emailFor: {
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

    const list = await EmailForModels.aggregate(query);

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
