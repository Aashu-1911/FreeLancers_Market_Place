const express = require("express");
const prisma = require("../lib/prisma");

const router = express.Router();

router.get("/overview", async (_req, res) => {
  try {
    const [totalProjects, totalFreelancers] = await Promise.all([
      prisma.project.count(),
      prisma.freelancer.count(),
    ]);

    return res.status(200).json({
      total_projects: totalProjects,
      total_freelancers: totalFreelancers,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch platform stats", error: error.message });
  }
});

module.exports = router;
