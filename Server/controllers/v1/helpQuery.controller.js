import HelpQuery from "../../models/HelpQuery.js";

export const submitHelpQuery = async (req, res) => {
  try {
    const { name, registration_id, category, description } = req.body;
    if (!name || !description) {
      return res
        .status(422)
        .json({
          isOk: false,
          status: 422,
          message: "name and description are required",
        });
    }
    const query = new HelpQuery({
      name,
      registration_id,
      category,
      description,
    });
    await query.save();
    return res
      .status(201)
      .json({
        isOk: true,
        status: 201,
        message: "Query submitted successfully",
      });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
  }
};
