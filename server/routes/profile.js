const express = require("express");
const { body } = require("express-validator");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const prisma = require("../lib/prisma");
const authMiddleware = require("../middleware/auth");
const validateRequest = require("../middleware/validateRequest");

const router = express.Router();
const uploadsRootDir = path.join(__dirname, "..", "uploads");
const resumesDir = path.join(uploadsRootDir, "resumes");
const allowedResumeMimeTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

if (!fs.existsSync(resumesDir)) {
  fs.mkdirSync(resumesDir, { recursive: true });
}

const resumeStorage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, resumesDir);
  },
  filename: (_req, file, callback) => {
    const safeBaseName = path
      .parse(file.originalname || "resume")
      .name.replace(/[^a-zA-Z0-9-_]/g, "_")
      .slice(0, 60);
    const extension = path.extname(file.originalname || "").toLowerCase();
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    callback(null, `${safeBaseName || "resume"}-${uniqueSuffix}${extension}`);
  },
});

const uploadResume = multer({
  storage: resumeStorage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    if (!allowedResumeMimeTypes.has(file.mimetype)) {
      callback(new Error("Only PDF, DOC, and DOCX files are allowed"));
      return;
    }

    callback(null, true);
  },
});

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

function isValidHttpUrl(value) {
  try {
    const parsedUrl = new URL(String(value));
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch (_error) {
    return false;
  }
}

function getResumePublicPath(fileName) {
  return `/uploads/resumes/${fileName}`;
}

function removePreviousResumeFile(resumePath) {
  if (!resumePath || typeof resumePath !== "string") {
    return;
  }

  const normalizedPath = resumePath.replace(/\\/g, "/");

  if (!normalizedPath.startsWith("/uploads/resumes/")) {
    return;
  }

  const relativeFilePath = normalizedPath.replace(/^\/uploads\//, "");
  const absoluteFilePath = path.join(uploadsRootDir, relativeFilePath);

  if (fs.existsSync(absoluteFilePath)) {
    fs.unlinkSync(absoluteFilePath);
  }
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
  body("portfolio")
    .optional({ nullable: true })
    .custom((value) => !value || isValidHttpUrl(value))
    .withMessage("portfolio must be a valid URL"),
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
            username: true,
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
            username: true,
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

router.post(
  "/freelancer/:id/resume",
  authMiddleware,
  (req, res, next) => {
    uploadResume.single("resume")(req, res, (error) => {
      if (!error) {
        next();
        return;
      }

      if (error.code === "LIMIT_FILE_SIZE") {
        res.status(400).json({ message: "Resume file must be 5MB or smaller" });
        return;
      }

      if (error.message && error.message.includes("Only PDF, DOC, and DOCX files are allowed")) {
        res.status(400).json({ message: error.message });
        return;
      }

      res.status(500).json({ message: "Failed to upload resume", error: error.message });
    });
  },
  async (req, res) => {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({ message: "Invalid freelancer id" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "resume file is required" });
    }

    const existingFreelancer = await prisma.freelancer.findFirst({
      where: {
        OR: [{ freelancer_id: id }, { user_id: id }],
      },
    });

    if (!existingFreelancer) {
      return res.status(404).json({ message: "Freelancer not found" });
    }

    if (existingFreelancer.user_id !== req.user.user_id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const resumePath = getResumePublicPath(req.file.filename);

    const updatedFreelancer = await prisma.freelancer.update({
      where: {
        freelancer_id: existingFreelancer.freelancer_id,
      },
      data: {
        resume: resumePath,
      },
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

    removePreviousResumeFile(existingFreelancer.resume);

    return res.status(200).json({
      message: "Resume uploaded successfully",
      resume: updatedFreelancer.resume,
      freelancer: updatedFreelancer,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to upload resume", error: error.message });
  }
}
);

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
            username: true,
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
            username: true,
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
