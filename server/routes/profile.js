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

function pickDefined(source, keys) {
  return keys.reduce((acc, key) => {
    if (Object.prototype.hasOwnProperty.call(source, key) && source[key] !== undefined) {
      acc[key] = source[key];
    }
    return acc;
  }, {});
}

const commonProfileValidation = [
  body("first_name").optional().trim().notEmpty().withMessage("first_name cannot be empty"),
  body("last_name").optional().trim().notEmpty().withMessage("last_name cannot be empty"),
  body("email").optional().isEmail().withMessage("email must be valid").normalizeEmail(),
  body("phone").optional({ nullable: true }).trim(),
  body("city").optional({ nullable: true }).trim(),
  body("pincode").optional({ nullable: true }).trim(),
];

const freelancerProfileValidation = [
  ...commonProfileValidation,
  body("year_of_study").optional({ nullable: true }).isInt({ min: 1 }).withMessage("year_of_study must be a positive integer"),
  body("availability").optional().isBoolean().withMessage("availability must be a boolean"),
];

const clientProfileValidation = [...commonProfileValidation];

router.get("/freelancer/:id", authMiddleware, async (req, res) => {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({ message: "Invalid freelancer id" });
    }

    const freelancer = await prisma.freelancer.findFirst({
      where: {
        OR: [{ freelancer_id: id }, { user_id: id }],
      },
      include: {
        user: {
          select: {
            user_id: true,
            first_name: true,
            last_name: true,
            email: true,
            phone: true,
            city: true,
            pincode: true,
            created_at: true,
          },
        },
        skills: {
          include: {
            skill: true,
          },
        },
      },
    });

    if (!freelancer) {
      return res.status(404).json({ message: "Freelancer not found" });
    }

    return res.status(200).json(freelancer);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch freelancer profile", error: error.message });
  }
});

router.put("/freelancer/:id", authMiddleware, freelancerProfileValidation, validateRequest, async (req, res) => {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({ message: "Invalid freelancer id" });
    }

    const existingFreelancer = await prisma.freelancer.findFirst({
      where: {
        OR: [{ freelancer_id: id }, { user_id: id }],
      },
      include: {
        user: true,
      },
    });

    if (!existingFreelancer) {
      return res.status(404).json({ message: "Freelancer not found" });
    }

    if (existingFreelancer.user_id !== req.user.user_id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const userPayload = pickDefined(req.body, ["first_name", "last_name", "email", "phone", "city", "pincode"]);
    const freelancerPayload = pickDefined(req.body, [
      "college_name",
      "degree",
      "year_of_study",
      "portfolio",
      "resume",
      "availability",
      "status",
    ]);

    if (Object.prototype.hasOwnProperty.call(freelancerPayload, "year_of_study") && freelancerPayload.year_of_study !== null) {
      freelancerPayload.year_of_study = Number(freelancerPayload.year_of_study);
    }

    await prisma.$transaction(async (tx) => {
      if (Object.keys(userPayload).length > 0) {
        await tx.user.update({
          where: { user_id: existingFreelancer.user_id },
          data: userPayload,
        });
      }

      if (Object.keys(freelancerPayload).length > 0) {
        await tx.freelancer.update({
          where: { freelancer_id: existingFreelancer.freelancer_id },
          data: freelancerPayload,
        });
      }
    });

    const updatedFreelancer = await prisma.freelancer.findUnique({
      where: { freelancer_id: existingFreelancer.freelancer_id },
      include: {
        user: {
          select: {
            user_id: true,
            first_name: true,
            last_name: true,
            email: true,
            phone: true,
            city: true,
            pincode: true,
            created_at: true,
          },
        },
        skills: {
          include: {
            skill: true,
          },
        },
      },
    });

    return res.status(200).json(updatedFreelancer);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ message: "Email already exists" });
    }

    return res.status(500).json({ message: "Failed to update freelancer profile", error: error.message });
  }
});

router.get("/client/:id", authMiddleware, async (req, res) => {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({ message: "Invalid client id" });
    }

    const client = await prisma.client.findFirst({
      where: {
        OR: [{ client_id: id }, { user_id: id }],
      },
      include: {
        user: {
          select: {
            user_id: true,
            first_name: true,
            last_name: true,
            email: true,
            phone: true,
            city: true,
            pincode: true,
            created_at: true,
          },
        },
      },
    });

    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    return res.status(200).json(client);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch client profile", error: error.message });
  }
});

router.put("/client/:id", authMiddleware, clientProfileValidation, validateRequest, async (req, res) => {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({ message: "Invalid client id" });
    }

    const existingClient = await prisma.client.findFirst({
      where: {
        OR: [{ client_id: id }, { user_id: id }],
      },
      include: {
        user: true,
      },
    });

    if (!existingClient) {
      return res.status(404).json({ message: "Client not found" });
    }

    if (existingClient.user_id !== req.user.user_id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const userPayload = pickDefined(req.body, ["first_name", "last_name", "email", "phone", "city", "pincode"]);
    const clientPayload = pickDefined(req.body, ["client_type"]);

    await prisma.$transaction(async (tx) => {
      if (Object.keys(userPayload).length > 0) {
        await tx.user.update({
          where: { user_id: existingClient.user_id },
          data: userPayload,
        });
      }

      if (Object.keys(clientPayload).length > 0) {
        await tx.client.update({
          where: { client_id: existingClient.client_id },
          data: clientPayload,
        });
      }
    });

    const updatedClient = await prisma.client.findUnique({
      where: { client_id: existingClient.client_id },
      include: {
        user: {
          select: {
            user_id: true,
            first_name: true,
            last_name: true,
            email: true,
            phone: true,
            city: true,
            pincode: true,
            created_at: true,
          },
        },
      },
    });

    return res.status(200).json(updatedClient);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ message: "Email already exists" });
    }

    return res.status(500).json({ message: "Failed to update client profile", error: error.message });
  }
});

module.exports = router;
