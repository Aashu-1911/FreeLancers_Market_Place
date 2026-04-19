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

const createApplicationValidation = [
  body("project_id").isInt({ min: 1 }).withMessage("project_id must be a positive integer"),
  body("freelancer_id").isInt({ min: 1 }).withMessage("freelancer_id must be a positive integer"),
];

router.post("/", authMiddleware, createApplicationValidation, validateRequest, async (req, res) => {
  try {
    if (req.user.role !== "freelancer") {
      return res.status(403).json({ message: "Only freelancers can apply to projects" });
    }

    const projectId = parseId(req.body.project_id);
    const freelancerId = parseId(req.body.freelancer_id);

    if (!projectId || !freelancerId) {
      return res.status(400).json({ message: "project_id and freelancer_id are required" });
    }

    const freelancer = await prisma.freelancer.findUnique({
      where: {
        user_id: req.user.user_id,
      },
    });

    if (!freelancer || freelancer.freelancer_id !== freelancerId) {
      return res.status(403).json({ message: "You can apply only as your own freelancer profile" });
    }

    const project = await prisma.project.findUnique({
      where: {
        project_id: projectId,
      },
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (project.project_status !== "open") {
      return res.status(400).json({ message: "Applications are allowed only for open projects" });
    }

    const application = await prisma.application.create({
      data: {
        project_id: projectId,
        freelancer_id: freelancerId,
      },
      include: {
        project: true,
      },
    });

    return res.status(201).json(application);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ message: "You already applied to this project" });
    }

    if (error.code === "P2003") {
      return res.status(404).json({ message: "Project or freelancer not found" });
    }

    return res.status(500).json({ message: "Failed to apply for project", error: error.message });
  }
});

router.get("/project/:project_id", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "client") {
      return res.status(403).json({ message: "Only clients can view project applicants" });
    }

    const projectId = parseId(req.params.project_id);

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

    const project = await prisma.project.findUnique({
      where: {
        project_id: projectId,
      },
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (project.client_id !== client.client_id) {
      return res.status(403).json({ message: "You can view applicants only for your own projects" });
    }

    const hiredContracts = await prisma.contract.findMany({
      where: {
        project_id: projectId,
      },
      select: {
        freelancer_id: true,
      },
    });

    const hiredFreelancerIds = [...new Set(hiredContracts.map((contract) => contract.freelancer_id))];

    const applications = await prisma.application.findMany({
      where: {
        project_id: projectId,
        freelancer_id: hiredFreelancerIds.length > 0 ? { notIn: hiredFreelancerIds } : undefined,
      },
      include: {
        freelancer: {
          include: {
            user: {
              select: {
                user_id: true,
                first_name: true,
                last_name: true,
                username: true,
                email: true,
                profile_picture: true,
                phone: true,
                city: true,
                pincode: true,
              },
            },
            skills: {
              include: {
                skill: {
                  select: {
                    skill_id: true,
                    skill_name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        applied_date: "desc",
      },
    });

    return res.status(200).json(applications);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch applicants", error: error.message });
  }
});

router.get("/freelancer/:freelancer_id", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "freelancer") {
      return res.status(403).json({ message: "Only freelancers can view their applications" });
    }

    const freelancerId = parseId(req.params.freelancer_id);

    if (!freelancerId) {
      return res.status(400).json({ message: "Invalid freelancer id" });
    }

    const freelancer = await prisma.freelancer.findUnique({
      where: {
        user_id: req.user.user_id,
      },
    });

    if (!freelancer || freelancer.freelancer_id !== freelancerId) {
      return res.status(403).json({ message: "You can view only your own applications" });
    }

    const applications = await prisma.application.findMany({
      where: {
        freelancer_id: freelancerId,
      },
      include: {
        project: {
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
        },
      },
      orderBy: {
        applied_date: "desc",
      },
    });

    return res.status(200).json(applications);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch freelancer applications", error: error.message });
  }
});

router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const applicationId = parseId(req.params.id);

    if (!applicationId) {
      return res.status(400).json({ message: "Invalid application id" });
    }

    const application = await prisma.application.findUnique({
      where: {
        application_id: applicationId,
      },
      include: {
        freelancer: {
          select: {
            user_id: true,
          },
        },
        project: {
          select: {
            project_id: true,
            client_id: true,
          },
        },
      },
    });

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    if (req.user.role === "freelancer") {
      if (application.freelancer.user_id !== req.user.user_id) {
        return res.status(403).json({ message: "You can withdraw only your own applications" });
      }

      await prisma.application.delete({
        where: {
          application_id: applicationId,
        },
      });

      return res.status(200).json({ message: "Application withdrawn successfully" });
    }

    if (req.user.role === "client") {
      const client = await prisma.client.findUnique({
        where: {
          user_id: req.user.user_id,
        },
      });

      if (!client) {
        return res.status(404).json({ message: "Client profile not found" });
      }

      if (application.project.client_id !== client.client_id) {
        return res.status(403).json({ message: "You can reject applicants only from your own projects" });
      }

      await prisma.application.delete({
        where: {
          application_id: applicationId,
        },
      });

      return res.status(200).json({ message: "Applicant rejected and removed" });
    }

    return res.status(403).json({ message: "Only freelancers and clients can remove applications" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to remove application", error: error.message });
  }
});

module.exports = router;
