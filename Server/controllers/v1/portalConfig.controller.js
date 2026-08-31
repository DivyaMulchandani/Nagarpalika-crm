import { getPortalConfigPayload } from "../../config/portal.config.js";

export const getPortalConfig = async (_req, res) => {
  try {
    return res.status(200).json({
      isOk: true,
      status: 200,
      data: getPortalConfigPayload(),
    });
  } catch (error) {
    console.error("[portalConfig] getPortalConfig error:", error.message);
    return res.status(500).json({ isOk: false, status: 500, message: "An unexpected error occurred" });
  }
};
