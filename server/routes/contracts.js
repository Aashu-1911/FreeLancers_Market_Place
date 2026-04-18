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

function parseAmount(rawAmount) {
  const parsed = Number(rawAmount);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseDate(rawDate) {
  if (!rawDate) {
    return null;
  }

  const parsed = new Date(rawDate);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const contractStatusValues = ["active", "completed", "cancelled"];
const contractScopeValues = ["full_project", "task_based"];

const createContractValidation = [
  body("project_id").isInt({ min: 1 }).withMessage("project_id must be a positive integer"),
  body("freelancer_id").isInt({ min: 1 }).withMessage("freelancer_id must be a positive integer"),
  body("client_id").isInt({ min: 1 }).withMessage("client_id must be a positive integer"),
  body("agreed_amount").isFloat({ gt: 0 }).withMessage("agreed_amount must be a positive number"),
  body("contract_scope").optional().isIn(contractScopeValues).withMessage("Invalid contract_scope value"),
  body("task_description").optional({ nullable: true }).trim(),
  body("start_date").isISO8601().withMessage("start_date must be a valid date"),
  body("end_date").optional({ nullable: true }).isISO8601().withMessage("end_date must be a valid date"),
  body("status").optional().isIn(contractStatusValues).withMessage("Invalid status value"),
];

const updateContractStatusValidation = [
  body("status").isIn(contractStatusValues).withMessage("Invalid status value"),
];

router.post("/", authMiddleware, createContractValidation, validateRequest, async (req, res) => {
  try {
    if (req.user.role !== "client") {
      return res.status(403).json({ message: "Only clients can create contracts" });
    }

    const {
      project_id,
      freelancer_id,
      client_id,
      agreed_amount,
      contract_scope,
      task_description,
      start_date,
      end_date,
      status,
    } = req.body;

    const projectId = parseId(project_id);
    const freelancerId = parseId(freelancer_id);
    const clientId = parseId(client_id);
    const agreedAmount = parseAmount(agreed_amount);
    const contractScope = contract_scope || "full_project";
    const taskDescription = task_description ? String(task_description).trim() : null;
    const startDate = parseDate(start_date);
    const endDate = end_date ? parseDate(end_date) : null;

    if (!projectId || !freelancerId || !clientId || !agreedAmount || !startDate) {
      return res.status(400).json({
        message: "project_id, freelancer_id, client_id, agreed_amount, and start_date are required",
      });
    }

    if (end_date && !endDate) {
      return res.status(400).json({ message: "Invalid end_date" });
    }

    if (!contractScopeValues.includes(contractScope)) {
      return res.status(400).json({ message: "Invalid contract_scope value" });
    }

    if (contractScope === "task_based" && !taskDescription) {
      return res.status(400).json({ message: "task_description is required for task_based contracts" });
    }

    const authClient = await prisma.client.findUnique({
      where: {
        user_id: req.user.user_id,
      },
    });

    if (!authClient) {
      return res.status(404).json({ message: "Client profile not found" });
    }

    if (authClient.client_id !== clientId) {
      return res.status(403).json({ message: "You can create contracts only with your own client profile" });
    }

    const project = await prisma.project.findUnique({
      where: {
        project_id: projectId,
      },
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (project.client_id !== clientId) {
      return res.status(403).json({ message: "This project does not belong to the given client" });
    }

    const freelancer = await prisma.freelancer.findUnique({
      where: {
        freelancer_id: freelancerId,
      },
    });

    if (!freelancer) {
      return res.status(404).json({ message: "Freelancer not found" });
    }

    const application = await prisma.application.findFirst({
      where: {
        project_id: projectId,
        freelancer_id: freelancerId,
      },
    });

    if (!application) {
      return res.status(400).json({ message: "Freelancer must apply before contract creation" });
    }

    const existingContract = await prisma.contract.findFirst({
      where: {
        project_id: projectId,
        freelancer_id: freelancerId,
        client_id: clientId,
      },
    });

    if (existingContract) {
      return res.status(409).json({ message: "Contract already exists for this project and freelancer" });
    }

    const createdContract = await prisma.$transaction(async (tx) => {
      const newContract = await tx.contract.create({
        data: {
          project_id: projectId,
          freelancer_id: freelancerId,
          client_id: clientId,
          agreed_amount: agreedAmount,
          contract_scope: contractScope,
          task_description: taskDescription,
          start_date: startDate,
          end_date: endDate,
          status: status || "active",
        },
        include: {
          project: true,
          freelancer: {
            include: {
              user: {
                select: {
                  user_id: true,
                  first_name: true,
                  last_name: true,
                  username: true,
                  email: true,
                  phone: true,
                  city: true,
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
          client: {
            include: {
              user: {
                select: {
                  user_id: true,
                  first_name: true,
                  last_name: true,
                  username: true,
                  email: true,
                  phone: true,
                  city: true,
                },
              },
            },
          },
        },
      });

      await tx.application.deleteMany({
        where: {
          project_id: projectId,
          freelancer_id: freelancerId,
        },
      });

      return newContract;
    });

    return res.status(201).json(createdContract);
  } catch (error) {
    return res.status(500).json({ message: "Failed to create contract", error: error.message });
  }
});

router.get("/freelancer/:freelancer_id", authMiddleware, async (req, res) => {
  try {
    const freelancerId = parseId(req.params.freelancer_id);

    if (!freelancerId) {
      return res.status(400).json({ message: "Invalid freelancer id" });
    }

    const freelancer = await prisma.freelancer.findUnique({
      where: {
        freelancer_id: freelancerId,
      },
    });

    if (!freelancer) {
      return res.status(404).json({ message: "Freelancer not found" });
    }

    if (req.user.role === "freelancer" && freelancer.user_id !== req.user.user_id) {
      return res.status(403).json({ message: "You can view only your own contracts" });
    }

    const contracts = await prisma.contract.findMany({
      where: {
        freelancer_id: freelancerId,
      },
      include: {
        project: true,
        client: {
          include: {
            user: {
              select: {
                user_id: true,
                first_name: true,
                last_name: true,
                username: true,
                email: true,
                phone: true,
                city: true,
              },
            },
          },
        },
      },
      orderBy: {
        start_date: "desc",
      },
    });

    return res.status(200).json(contracts);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch freelancer contracts", error: error.message });
  }
});

router.get("/client/:client_id", authMiddleware, async (req, res) => {
  try {
    const clientId = parseId(req.params.client_id);

    if (!clientId) {
      return res.status(400).json({ message: "Invalid client id" });
    }

    const client = await prisma.client.findUnique({
      where: {
        client_id: clientId,
      },
    });

    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    if (req.user.role === "client" && client.user_id !== req.user.user_id) {
      return res.status(403).json({ message: "You can view only your own contracts" });
    }

    const contracts = await prisma.contract.findMany({
      where: {
        client_id: clientId,
      },
      include: {
        project: true,
        freelancer: {
          include: {
            user: {
              select: {
                user_id: true,
                first_name: true,
                last_name: true,
                username: true,
                email: true,
                phone: true,
                city: true,
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
        start_date: "desc",
      },
    });

    return res.status(200).json(contracts);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch client contracts", error: error.message });
  }
});

router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const contractId = parseId(req.params.id);

    if (!contractId) {
      return res.status(400).json({ message: "Invalid contract id" });
    }

    const contract = await prisma.contract.findUnique({
      where: {
        contract_id: contractId,
      },
      include: {
        project: true,
        freelancer: {
          include: {
            user: {
              select: {
                user_id: true,
                first_name: true,
                last_name: true,
                username: true,
                email: true,
                phone: true,
                city: true,
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
        client: {
          include: {
            user: {
              select: {
                user_id: true,
                first_name: true,
                last_name: true,
                username: true,
                email: true,
                phone: true,
                city: true,
              },
            },
          },
        },
        payments: {
          orderBy: {
            transaction_date: "desc",
          },
        },
      },
    });

    if (!contract) {
      return res.status(404).json({ message: "Contract not found" });
    }

    const isFreelancerOwner = req.user.role === "freelancer" && contract.freelancer.user_id === req.user.user_id;
    const isClientOwner = req.user.role === "client" && contract.client.user_id === req.user.user_id;

    if (!isFreelancerOwner && !isClientOwner) {
      return res.status(403).json({ message: "Forbidden" });
    }

    return res.status(200).json(contract);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch contract", error: error.message });
  }
});

router.put("/:id/status", authMiddleware, updateContractStatusValidation, validateRequest, async (req, res) => {
  try {
    const contractId = parseId(req.params.id);
    const nextStatus = req.body.status;

    if (!contractId || !nextStatus) {
      return res.status(400).json({ message: "Contract id and status are required" });
    }

    const allowedStatuses = ["active", "completed", "cancelled"];

    if (!allowedStatuses.includes(nextStatus)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const contract = await prisma.contract.findUnique({
      where: {
        contract_id: contractId,
      },
      include: {
        client: true,
      },
    });

    if (!contract) {
      return res.status(404).json({ message: "Contract not found" });
    }

    if (req.user.role !== "client" || contract.client.user_id !== req.user.user_id) {
      return res.status(403).json({ message: "Only owning client can update contract status" });
    }

    if (contract.status !== "active" && nextStatus !== contract.status) {
      return res.status(400).json({ message: "Only active contracts can be transitioned" });
    }

    const updatedContract = await prisma.contract.update({
      where: {
        contract_id: contractId,
      },
      data: {
        status: nextStatus,
      },
      include: {
        project: true,
        freelancer: {
          include: {
            user: {
              select: {
                first_name: true,
                last_name: true,
                username: true,
                email: true,
                phone: true,
                city: true,
              },
            },
          },
        },
        client: {
          include: {
            user: {
              select: {
                first_name: true,
                last_name: true,
                username: true,
                email: true,
                phone: true,
                city: true,
              },
            },
          },
        },
      },
    });

    return res.status(200).json(updatedContract);
  } catch (error) {
    return res.status(500).json({ message: "Failed to update contract status", error: error.message });
  }
});

module.exports = router;
