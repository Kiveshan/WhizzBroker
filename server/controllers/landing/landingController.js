import { getInstructionStatusCounts } from "../../models/landing/landingModel.js";

export const getLandingStats = async (req, res) => {
  try {
    const stats = await getInstructionStatusCounts();
    return res.json(stats);
  } catch (error) {
    console.error("Error fetching landing stats:", error);
    return res.status(500).json({ message: "Failed to fetch landing stats" });
  }
};
