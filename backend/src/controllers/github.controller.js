import { getProjectGithubInfo } from "../services/github.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getProjectGithub = asyncHandler(async function getProjectGithub(req, res) {
  const data = await getProjectGithubInfo(req.project);
  res.status(200).json({ success: true, data });
});
