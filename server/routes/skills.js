const express = require("express");
const { body } = require("express-validator");
const prisma = require("../lib/prisma");
const authMiddleware = require("../middleware/auth");
const validateRequest = require("../middleware/validateRequest");

const router = express.Router();

function parseId(rawId) {
  const parsed = Number(rawId);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

const createSkillValidation = [
  body("skill_name").trim().notEmpty().withMessage("skill_name is required"),
  body("description").optional({ nullable: true }).trim(),
];

const assignSkillValidation = [
  body("freelancer_id").isInt({ min: 1 }).withMessage("freelancer_id must be a positive integer"),
  body("skill_id").isInt({ min: 1 }).withMessage("skill_id must be a positive integer"),
];

router.get("/", async (_req, res) => {
  try {
    const skills = await prisma.skill.findMany({
      orderBy: {
        skill_name: "asc",
      },
    });

    return res.status(200).json(skills);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch skills", error: error.message });
  }
});

router.post("/", authMiddleware, createSkillValidation, validateRequest, async (req, res) => {
  try {
    const { skill_name, description } = req.body;

    if (!skill_name) {
      return res.status(400).json({ message: "skill_name is required" });
    }

    const skill = await prisma.skill.create({
      data: {
        skill_name,
        description: description ?? null,
      },
    });

    return res.status(201).json(skill);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ message: "Skill already exists" });
    }

    return res.status(500).json({ message: "Failed to create skill", error: error.message });
  }
});

router.post("/assign", authMiddleware, assignSkillValidation, validateRequest, async (req, res) => {
  try {
    const freelancerId = parseId(req.body.freelancer_id);
    const skillId = parseId(req.body.skill_id);

    if (!freelancerId || !skillId) {
      return res.status(400).json({ message: "freelancer_id and skill_id are required" });
    }

    if (req.user.role === "freelancer") {
      const ownFreelancer = await prisma.freelancer.findUnique({
        where: {
          user_id: req.user.user_id,
        },
      });

      if (!ownFreelancer || ownFreelancer.freelancer_id !== freelancerId) {
        return res.status(403).json({ message: "You can assign skills only to your own profile" });
      }
    }

    const assignment = await prisma.freelancerSkill.create({
      data: {
        freelancer_id: freelancerId,
        skill_id: skillId,
      },
      include: {
        skill: true,
      },
    });

    return res.status(201).json(assignment);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ message: "Skill is already assigned to this freelancer" });
    }

    if (error.code === "P2003") {
      return res.status(404).json({ message: "Freelancer or skill not found" });
    }

    return res.status(500).json({ message: "Failed to assign skill", error: error.message });
  }
});

router.delete("/remove", authMiddleware, async (req, res) => {
  try {
    const freelancerId = parseId(req.body.freelancer_id);
    const skillId = parseId(req.body.skill_id);

    if (!freelancerId || !skillId) {
      return res.status(400).json({ message: "freelancer_id and skill_id are required" });
    }

    if (req.user.role === "freelancer") {
      const ownFreelancer = await prisma.freelancer.findUnique({
        where: {
          user_id: req.user.user_id,
        },
      });

      if (!ownFreelancer || ownFreelancer.freelancer_id !== freelancerId) {
        return res.status(403).json({ message: "You can remove skills only from your own profile" });
      }
    }

    const removalResult = await prisma.freelancerSkill.deleteMany({
      where: {
        freelancer_id: freelancerId,
        skill_id: skillId,
      },
    });

    if (removalResult.count === 0) {
      return res.status(404).json({ message: "Skill assignment not found" });
    }

    return res.status(200).json({ message: "Skill removed successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to remove skill", error: error.message });
  }
});

module.exports = router;
