import EmailTemplateModels from "../../models/EmailTemplate.js";

export const createEmailTemplate = async (req, res) => {
  try {
    const {
      templateName,
      emailFrom,
      emailFor,
      mailerName,
      emailCC,
      emailBCC,
      emailSubject,
      emailSignature,
      isActive,
    } = req.body;

    const emailTemplate = new EmailTemplateModels({
      templateName,
      emailFrom,
      emailFor,
      mailerName,
      emailCC,
      emailBCC,
      emailSubject,
      emailSignature,
      isActive,
    });

    await emailTemplate.save();

    return res.status(201).json({
      isOk: true,
      status: 201,
      message: "Email Template created successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      isOk: false,
      status: 500,
      message: "Internal server error",
      error: error,
    });
  }
};

export const updateEmailTemplate = async (req, res) => {
  try {
    const { emailTemplateId } = req.params;

    const {
      templateName,
      emailFrom,
      emailFor,
      mailerName,
      emailCC,
      emailBCC,
      emailSubject,
      emailSignature,
      isActive,
    } = req.body;

    const emailTemplate = await EmailTemplateModels.findById(emailTemplateId);

    if (!emailTemplate) {
      return res.status(404).json({
        isOk: false,
        status: 404,
        message: "Email Template not found",
      });
    }

    await EmailTemplateModels.findByIdAndUpdate(
      emailTemplateId,
      {
        templateName,
        emailFrom,
        emailFor,
        mailerName,
        emailCC,
        emailBCC,
        emailSubject,
        emailSignature,
        isActive,
      },
      { new: true },
    );

    return res.status(200).json({
      isOk: true,
      status: 200,
      message: "Email Template updated successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      isOk: false,
      status: 500,
      message: "Internal server error",
      error: error,
    });
  }
};

export const getEmailTemplateById = async (req, res) => {
  try {
    const { emailTemplateId } = req.params;

    const emailTemplate = await EmailTemplateModels.findById(emailTemplateId)
      .populate("emailFrom")
      .populate("emailFor");

    if (!emailTemplate) {
      return res.status(404).json({
        isOk: false,
        status: 404,
        message: "Email Template not found",
      });
    }

    return res.status(200).json({
      isOk: true,
      status: 200,
      data: emailTemplate,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      isOk: false,
      status: 500,
      message: "Internal server error",
      error: error,
    });
  }
};

export const deleteEmailTemplate = async (req, res) => {
  try {
    const { emailTemplateId } = req.params;

    const emailTemplate = await EmailTemplateModels.findById(emailTemplateId);

    if (!emailTemplate) {
      return res.status(404).json({
        isOk: false,
        status: 404,
        message: "Email Template not found",
      });
    }

    await EmailTemplateModels.findByIdAndDelete(emailTemplateId);

    return res.status(200).json({
      isOk: true,
      status: 200,
      message: "Email Template deleted successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      isOk: false,
      status: 500,
      message: "Internal server error",
      error: error,
    });
  }
};

export const listEmailTemplateByParams = async (req, res) => {
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
          from: "emailsetups",
          localField: "emailFrom",
          foreignField: "_id",
          as: "emailFrom",
        },
      },
      {
        $lookup: {
          from: "emailfors",
          localField: "emailFor",
          foreignField: "_id",
          as: "emailFor",
        },
      },
      {
        $unwind: {
          path: "$emailFrom",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$emailFor",
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
      query = [
        {
          $match: {
            $or: [
              {
                templateName: {
                  $regex: match,
                  $options: "i",
                },
              },
              {
                mailerName: {
                  $regex: match,
                  $options: "i",
                },
              },
              {
                emailSubject: {
                  $regex: match,
                  $options: "i",
                },
              },
              {
                "emailFrom.email": {
                  $regex: match,
                  $options: "i",
                },
              },
              {
                "emailFor.emailFor": {
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

    const list = await EmailTemplateModels.aggregate(query);

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

export const listAllEmailTemplates = async (req, res) => {
  try {
    const emailTemplates = await EmailTemplateModels.find({
      isActive: true,
    }).select("_id templateName");
    return res.status(200).json({
      isOk: true,
      data: emailTemplates,
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
