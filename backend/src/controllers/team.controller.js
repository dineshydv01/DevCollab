import { assignMemberRole, removeMemberFromProject } from "../services/project.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getProjectTeam = asyncHandler(async function getProjectTeam(req, res) {
  // req.project was already fetched by loadProject (with owner
  // populated). Populating members.user HERE, on this one document,
  // rather than changing what loadProject populates globally, keeps
  // every other route (matching, applications, etc.) that relies on
  // project.members[i].user being a raw ObjectId — not a populated
  // document — completely unaffected.
  await req.project.populate("members.user", "fullName username profileImage skills experienceLevel rating");

  const activeMembers = req.project.members.filter((m) => m.status === "active");

  res.status(200).json({
    success: true,
    data: {
      owner: req.project.owner,
      members: activeMembers,
    },
  });
});

export const updateMemberRole = asyncHandler(async function updateMemberRole(req, res) {
  const updatedProject = await assignMemberRole(req.project, req.params.userId, req.body.role);

  res.status(200).json({
    success: true,
    message: "Role updated successfully",
    data: updatedProject.members,
  });
});

export const removeMember = asyncHandler(async function removeMember(req, res) {
  const updatedProject = await removeMemberFromProject(req.project, req.params.userId);

  res.status(200).json({
    success: true,
    message: "Member removed successfully",
    data: updatedProject.members,
  });
});
