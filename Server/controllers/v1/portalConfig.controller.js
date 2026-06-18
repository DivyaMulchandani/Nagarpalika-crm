import { getPortalConfigPayload } from "../../config/portal.config.js";

export const getPortalConfig = async (_req, res) => {
  try {
    return res.status(200).json({
      isOk: true,
      status: 200,
      data: getPortalConfigPayload(),
    });
  } catch (error) {
    return res.status(500).json({ isOk: false, status: 500, message: error.message });
  }
};
