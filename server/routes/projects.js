const express = require("express");
const prisma = require("../lib/prisma");
const authMiddleware = require("../middleware/auth");

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

function pickDefined(source, keys) {
  return keys.reduce((acc, key) => {
    if (Object.prototype.hasOwnProperty.call(source, key) && source[key] !== undefined) {
      acc[key] = source[key];
    }

    return acc;
  }, {});
}

router.post("/", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "client") {
      return res.status(403).json({ message: "Only clients can post projects" });
    }

    const { title, description, budget, deadline, project_status } = req.body;

    if (!title || !description || !budget || !deadline) {
      return res.status(400).json({ message: "title, description, budget, and deadline are required" });
    }

    const parsedBudget = parseBudget(budget);
    const parsedDeadline = parseDeadline(deadline);

    if (!parsedBudget) {
      return res.status(400).json({ message: "Invalid budget" });
    }

    if (!parsedDeadline) {
      return res.status(400).json({ message: "Invalid deadline" });
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
        deadline: parsedDeadline,
        project_status: project_status || "open",
      },
      include: {
        client: {
          include: {
            user: {
              select: {
                first_name: true,
                last_name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return res.status(201).json(project);
  } catch (error) {
    return res.status(500).json({ message: "Failed to create project", error: error.message });
  }
});

router.get("/", async (_req, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: {
        project_status: "open",
      },
      include: {
        client: {
          include: {
            user: {
              select: {
                user_id: true,
                first_name: true,
                last_name: true,
                email: true,
                city: true,
              },
            },
          },
        },
      },
      orderBy: {
        posted_date: "desc",
      },
    });

    return res.status(200).json(projects);
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
      include: {
        client: {
          include: {
            user: {
              select: {
                user_id: true,
                first_name: true,
                last_name: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            applications: true,
          },
        },
      },
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
      include: {
        client: {
          include: {
            user: {
              select: {
                user_id: true,
                first_name: true,
                last_name: true,
                email: true,
                phone: true,
                city: true,
              },
            },
          },
        },
        _count: {
          select: {
            applications: true,
          },
        },
      },
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    return res.status(200).json(project);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch project", error: error.message });
  }
});

router.put("/:id", authMiddleware, async (req, res) => {
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

    const payload = pickDefined(req.body, ["title", "description", "budget", "deadline", "project_status"]);

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

    const updatedProject = await prisma.project.update({
      where: {
        project_id: projectId,
      },
      data: payload,
      include: {
        client: {
          include: {
            user: {
              select: {
                user_id: true,
                first_name: true,
                last_name: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            applications: true,
          },
        },
      },
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
