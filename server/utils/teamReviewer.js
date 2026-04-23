function parseTeamReviewerAllowList() {
  return new Set(
    String(process.env.TEAM_REVIEWERS || "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  );
}

function isUserAllowedTeamReviewer(user, allowList = parseTeamReviewerAllowList()) {
  if (!user || allowList.size === 0) {
    return false;
  }

  const email = String(user.email || "").trim().toLowerCase();
  const username = String(user.username || "").trim().toLowerCase();

  return allowList.has(email) || allowList.has(username);
}

module.exports = {
  parseTeamReviewerAllowList,
  isUserAllowedTeamReviewer,
};
