const express = require("express");
const { body } = require("express-validator");
const prisma = require("../lib/prisma");
const authMiddleware = require("../middleware/auth");
const validateRequest = require("../middleware/validateRequest");
const { verifyToken } = require("../utils/jwt");

const router = express.Router();

function parseId(rawId) {
  const parsed = Number(rawId);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseBudget(rawBudget) {
  const parsed = Number(rawBudget);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseDeadline(rawDeadline) {
  const parsed = new Date(rawDeadline);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseTechStack(rawTechStack) {
  if (rawTechStack === undefined) {
    return undefined;
  }

  if (!Array.isArray(rawTechStack)) {
    return null;
  }

  return [...new Set(rawTechStack.map((item) => String(item || "").trim()).filter(Boolean))];
}

function parseSkillIds(rawSkillIds) {
  if (rawSkillIds === undefined) {
    return undefined;
  }

  if (!Array.isArray(rawSkillIds)) {
    return null;
  }

  const parsedSkillIds = rawSkillIds.map((skillId) => parseId(skillId));

  if (parsedSkillIds.some((skillId) => !skillId)) {
    return null;
  }

  return [...new Set(parsedSkillIds)];
}

function getOptionalUserFromAuthHeader(req) {
  const authHeader = req.headers.authorization || "";

  if (!authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.split(" ")[1];

  try {
    return verifyToken(token);
  } catch (_error) {
    return null;
  }
}

async function ensureSkillIdsExist(skillIds) {
  if (!skillIds || skillIds.length === 0) {
    return true;
  }

  const existingCount = await prisma.skill.count({
    where: {
      skill_id: {
        in: skillIds,
      },
    },
  });

  return existingCount === skillIds.length;
}

const baseClientUserSelect = {
  user_id: true,
  first_name: true,
  last_name: true,
  email: true,
  city: true,
};

const projectInclude = {
  client: {
    include: {
      user: {
        select: baseClientUserSelect,
      },
    },
  },
  requiredSkills: {
    include: {
      skill: {
        select: {
          skill_id: true,
          skill_name: true,
        },
      },
    },
  },
};

const projectIncludeWithCount = {
  ...projectInclude,
  _count: {
    select: {
      applications: true,
    },
  },
};

const projectDetailIncludeWithCount = {
  ...projectIncludeWithCount,
  client: {
    include: {
      user: {
        select: {
          ...baseClientUserSelect,
          phone: true,
        },
      },
    },
  },
};

function withMatchMetadata(project, freelancerSkillSet) {
  const requiredSkillIds = project.requiredSkills.map((entry) => entry.skill_id);
  const matchedSkillIds = requiredSkillIds.filter((skillId) => freelancerSkillSet.has(skillId));
  const requiredSkillsCount = requiredSkillIds.length;
  const matchedSkillsCount = matchedSkillIds.length;
  const hasSkillMatch = requiredSkillsCount > 0 && matchedSkillsCount > 0;
  const matchScore = requiredSkillsCount > 0 ? matchedSkillsCount / requiredSkillsCount : 0;

  return {
    ...project,
    required_skills_count: requiredSkillsCount,
    matched_skills_count: matchedSkillsCount,
    matched_skill_ids: matchedSkillIds,
    has_skill_match: hasSkillMatch,
    match_score: Number(matchScore.toFixed(4)),
  };
}

function pickDefined(source, keys) {
  return keys.reduce((acc, key) => {
    if (Object.prototype.hasOwnProperty.call(source, key) && source[key] !== undefined) {
      acc[key] = source[key];
    }

    return acc;
  }, {});
}

const projectStatusValues = ["open", "in_progress", "closed"];

const createProjectValidation = [
  body("title").trim().notEmpty().withMessage("title is required"),
  body("description").trim().notEmpty().withMessage("description is required"),
  body("budget").isFloat({ gt: 0 }).withMessage("budget must be a positive number"),
  body("deadline").isISO8601().withMessage("deadline must be a valid date"),
  body("tech_stack").optional().isArray().withMessage("tech_stack must be an array"),
  body("tech_stack.*").optional().isString().withMessage("tech_stack must contain only strings"),
  body("required_skill_ids").optional().isArray().withMessage("required_skill_ids must be an array"),
  body("required_skill_ids.*")
    .optional()
    .isInt({ min: 1 })
    .withMessage("required_skill_ids must contain positive integers"),
  body("project_status").optional().isIn(projectStatusValues).withMessage("Invalid project_status"),
];

const updateProjectValidation = [
  body("title").optional().trim().notEmpty().withMessage("title cannot be empty"),
  body("description").optional().trim().notEmpty().withMessage("description cannot be empty"),
  body("budget").optional().isFloat({ gt: 0 }).withMessage("budget must be a positive number"),
  body("deadline").optional().isISO8601().withMessage("deadline must be a valid date"),
  body("tech_stack").optional().isArray().withMessage("tech_stack must be an array"),
  body("tech_stack.*").optional().isString().withMessage("tech_stack must contain only strings"),
  body("required_skill_ids").optional().isArray().withMessage("required_skill_ids must be an array"),
  body("required_skill_ids.*")
    .optional()
    .isInt({ min: 1 })
    .withMessage("required_skill_ids must contain positive integers"),
  body("project_status").optional().isIn(projectStatusValues).withMessage("Invalid project_status"),
];

router.post("/", authMiddleware, createProjectValidation, validateRequest, async (req, res) => {
  try {
    if (req.user.role !== "client") {
      return res.status(403).json({ message: "Only clients can post projects" });
    }

    const { title, description, budget, deadline, tech_stack, required_skill_ids, project_status } = req.body;

    if (!title || !description || !budget || !deadline) {
      return res.status(400).json({ message: "title, description, budget, and deadline are required" });
    }

    const parsedBudget = parseBudget(budget);
    const parsedDeadline = parseDeadline(deadline);
    const parsedTechStack = parseTechStack(tech_stack ?? []);
    const parsedRequiredSkillIds = parseSkillIds(required_skill_ids ?? []);

    if (!parsedBudget) {
      return res.status(400).json({ message: "Invalid budget" });
    }

    if (!parsedDeadline) {
      return res.status(400).json({ message: "Invalid deadline" });
    }

    if (!parsedTechStack) {
      return res.status(400).json({ message: "Invalid tech_stack" });
    }

    if (!parsedRequiredSkillIds) {
      return res.status(400).json({ message: "Invalid required_skill_ids" });
    }

    const allSkillsExist = await ensureSkillIdsExist(parsedRequiredSkillIds);

    if (!allSkillsExist) {
      return res.status(404).json({ message: "One or more required skills do not exist" });
    }

    const client = await prisma.client.findUnique({
      where: {
        user_id: req.user.user_id,
      },
    });

    if (!client) {
      return res.status(404).json({ message: "Client profile not found" });
    }

    const project = await prisma.project.create({
      data: {
        client_id: client.client_id,
        title,
        description,
        budget: parsedBudget,
        tech_stack: parsedTechStack,
        deadline: parsedDeadline,
        project_status: project_status || "open",
        requiredSkills:
          parsedRequiredSkillIds.length > 0
            ? {
                create: parsedRequiredSkillIds.map((skillId) => ({
                  skill_id: skillId,
                })),
              }
            : undefined,
      },
      include: projectInclude,
    });

    return res.status(201).json(project);
  } catch (error) {
    return res.status(500).json({ message: "Failed to create project", error: error.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: {
        project_status: "open",
      },
      include: projectInclude,
      orderBy: {
        posted_date: "desc",
      },
    });

    const optionalUser = getOptionalUserFromAuthHeader(req);

    if (!optionalUser || optionalUser.role !== "freelancer") {
      return res.status(200).json(projects);
    }

    const freelancer = await prisma.freelancer.findUnique({
      where: {
        user_id: optionalUser.user_id,
      },
      include: {
        skills: {
          select: {
            skill_id: true,
          },
        },
      },
    });

    if (!freelancer) {
      return res.status(200).json(projects);
    }

    const freelancerSkillSet = new Set(freelancer.skills.map((skillEntry) => skillEntry.skill_id));

    const rankedProjects = projects
      .map((project) => withMatchMetadata(project, freelancerSkillSet))
      .sort((projectA, projectB) => {
        if (projectA.has_skill_match !== projectB.has_skill_match) {
          return Number(projectB.has_skill_match) - Number(projectA.has_skill_match);
        }

        if (projectA.match_score !== projectB.match_score) {
          return projectB.match_score - projectA.match_score;
        }

        return new Date(projectB.posted_date).getTime() - new Date(projectA.posted_date).getTime();
      });

    return res.status(200).json(rankedProjects);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch projects", error: error.message });
  }
});

router.get("/client/:client_id", async (req, res) => {
  try {
    const clientId = parseId(req.params.client_id);

    if (!clientId) {
      return res.status(400).json({ message: "Invalid client id" });
    }

    const projects = await prisma.project.findMany({
      where: {
        client_id: clientId,
      },
      include: projectIncludeWithCount,
      orderBy: {
        posted_date: "desc",
      },
    });

    return res.status(200).json(projects);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch client projects", error: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const projectId = parseId(req.params.id);

    if (!projectId) {
      return res.status(400).json({ message: "Invalid project id" });
    }

    const project = await prisma.project.findUnique({
      where: {
        project_id: projectId,
      },
      include: projectDetailIncludeWithCount,
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const optionalUser = getOptionalUserFromAuthHeader(req);

    if (optionalUser && optionalUser.role === "freelancer") {
      const freelancer = await prisma.freelancer.findUnique({
        where: {
          user_id: optionalUser.user_id,
        },
        include: {
          skills: {
            select: {
              skill_id: true,
            },
          },
        },
      });

      if (freelancer) {
        const freelancerSkillSet = new Set(freelancer.skills.map((skillEntry) => skillEntry.skill_id));
        return res.status(200).json(withMatchMetadata(project, freelancerSkillSet));
      }
    }

    return res.status(200).json(project);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch project", error: error.message });
  }
});

router.put("/:id", authMiddleware, updateProjectValidation, validateRequest, async (req, res) => {
  try {
    if (req.user.role !== "client") {
      return res.status(403).json({ message: "Only clients can update projects" });
    }

    const projectId = parseId(req.params.id);

    if (!projectId) {
      return res.status(400).json({ message: "Invalid project id" });
    }

    const client = await prisma.client.findUnique({
      where: {
        user_id: req.user.user_id,
      },
    });

    if (!client) {
      return res.status(404).json({ message: "Client profile not found" });
    }

    const existingProject = await prisma.project.findUnique({
      where: {
        project_id: projectId,
      },
    });

    if (!existingProject) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (existingProject.client_id !== client.client_id) {
      return res.status(403).json({ message: "You can update only your own projects" });
    }

    const payload = pickDefined(req.body, ["title", "description", "budget", "deadline", "project_status", "tech_stack"]);
    const hasRequiredSkillIds = Object.prototype.hasOwnProperty.call(req.body, "required_skill_ids");
    const parsedRequiredSkillIds = parseSkillIds(req.body.required_skill_ids);

    if (Object.prototype.hasOwnProperty.call(payload, "budget")) {
      const parsedBudget = parseBudget(payload.budget);

      if (!parsedBudget) {
        return res.status(400).json({ message: "Invalid budget" });
      }

      payload.budget = parsedBudget;
    }

    if (Object.prototype.hasOwnProperty.call(payload, "deadline")) {
      const parsedDeadline = parseDeadline(payload.deadline);

      if (!parsedDeadline) {
        return res.status(400).json({ message: "Invalid deadline" });
      }

      payload.deadline = parsedDeadline;
    }

    if (Object.prototype.hasOwnProperty.call(payload, "tech_stack")) {
      const parsedTechStack = parseTechStack(payload.tech_stack);

      if (!parsedTechStack) {
        return res.status(400).json({ message: "Invalid tech_stack" });
      }

      payload.tech_stack = parsedTechStack;
    }

    if (hasRequiredSkillIds && !parsedRequiredSkillIds) {
      return res.status(400).json({ message: "Invalid required_skill_ids" });
    }

    if (hasRequiredSkillIds) {
      const allSkillsExist = await ensureSkillIdsExist(parsedRequiredSkillIds);

      if (!allSkillsExist) {
        return res.status(404).json({ message: "One or more required skills do not exist" });
      }
    }

    const updatedProject = await prisma.$transaction(async (tx) => {
      if (hasRequiredSkillIds) {
        await tx.projectSkill.deleteMany({
          where: {
            project_id: projectId,
          },
        });

        if (parsedRequiredSkillIds.length > 0) {
          await tx.projectSkill.createMany({
            data: parsedRequiredSkillIds.map((skillId) => ({
              project_id: projectId,
              skill_id: skillId,
            })),
            skipDuplicates: true,
          });
        }
      }

      return tx.project.update({
        where: {
          project_id: projectId,
        },
        data: payload,
        include: projectIncludeWithCount,
      });
    });

    return res.status(200).json(updatedProject);
  } catch (error) {
    return res.status(500).json({ message: "Failed to update project", error: error.message });
  }
});

router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "client") {
      return res.status(403).json({ message: "Only clients can delete projects" });
    }

    const projectId = parseId(req.params.id);

    if (!projectId) {
      return res.status(400).json({ message: "Invalid project id" });
    }

    const client = await prisma.client.findUnique({
      where: {
        user_id: req.user.user_id,
      },
    });

    if (!client) {
      return res.status(404).json({ message: "Client profile not found" });
    }

    const existingProject = await prisma.project.findUnique({
      where: {
        project_id: projectId,
      },
    });

    if (!existingProject) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (existingProject.client_id !== client.client_id) {
      return res.status(403).json({ message: "You can delete only your own projects" });
    }

    await prisma.project.delete({
      where: {
        project_id: projectId,
      },
    });

    return res.status(200).json({ message: "Project deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete project", error: error.message });
  }
});

module.exports = router;
