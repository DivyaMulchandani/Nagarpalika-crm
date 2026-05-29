import HelpQuery from "../../models/HelpQuery.js";

export const submitHelpQuery = async (req, res) => {
  try {
    const { name, mobile, email, registration_id, category, subject, message } =
      req.body;
    if (!name || !message) {
      return res.status(422).json({
        isOk: false,
        status: 422,
        message: "name and message are required",
      });
    }
    const query = new HelpQuery({
      name,
      mobile,
      email,
      registration_id,
      category,
      subject,
      message,
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

export const getHelpQueries = async (req, res) => {
  try {
    const { status, category, search, skip = 0, per_page = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (search) {
      const re = new RegExp(search, "i");
      filter.$or = [
        { name: re },
        { email: re },
        { mobile: re },
        { subject: re },
        { registration_id: re },
      ];
    }

    const [data, total] = await Promise.all([
      HelpQuery.find(filter)
        .sort({ createdAt: -1 })
        .skip(Number(skip))
        .limit(Number(per_page)),
      HelpQuery.countDocuments(filter),
    ]);

    return res
      .status(200)
      .json({ isOk: true, status: 200, data: { data, total } });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
  }
};

export const updateHelpQueryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!["open", "resolved"].includes(status)) {
      return res
        .status(422)
        .json({ isOk: false, status: 422, message: "Invalid status" });
    }
    const query = await HelpQuery.findByIdAndUpdate(
      id,
      { status },
      { new: true },
    );
    if (!query)
      return res
        .status(404)
        .json({ isOk: false, status: 404, message: "Query not found" });
    return res.status(200).json({ isOk: true, status: 200, data: query });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: error.message });
  }
};
