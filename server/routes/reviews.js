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

function parseRating(rawRating) {
  const parsed = Number(rawRating);
  return Number.isInteger(parsed) ? parsed : null;
}

const createReviewValidation = [
  body("contract_id").isInt({ min: 1 }).withMessage("contract_id must be a positive integer"),
  body("user_id").isInt({ min: 1 }).withMessage("user_id must be a positive integer"),
  body("rating").isInt({ min: 1, max: 5 }).withMessage("rating must be between 1 and 5"),
  body("comment").optional({ nullable: true }).trim(),
  body("report_issue").optional().isBoolean().withMessage("report_issue must be true or false"),
  body("report_reason").optional({ nullable: true }).trim(),
];

function withReportMeta(review) {
  const comment = String(review.comment || "");
  const marker = "Reported Issue:";
  const markerIndex = comment.indexOf(marker);

  if (markerIndex === -1) {
    return {
      ...review,
      report_issue: false,
      report_reason: null,
    };
  }

  const reportReason = comment.slice(markerIndex + marker.length).trim() || null;

  return {
    ...review,
    report_issue: Boolean(reportReason),
    report_reason: reportReason,
  };
}

router.post("/", authMiddleware, createReviewValidation, validateRequest, async (req, res) => {
  try {
    if (req.user.role !== "client") {
      return res.status(403).json({ message: "Only clients can submit reviews" });
    }

    const contractId = parseId(req.body.contract_id);
    const userId = parseId(req.body.user_id);
    const rating = parseRating(req.body.rating);
    const rawComment = req.body.comment ?? null;
    const reportIssue = req.body.report_issue === true;
    const reportReason = req.body.report_reason ? String(req.body.report_reason).trim() : null;

    if (!contractId || !userId || !rating) {
      return res.status(400).json({ message: "contract_id, user_id, and rating are required" });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: "rating must be between 1 and 5" });
    }

    if (reportIssue && !reportReason) {
      return res.status(400).json({ message: "report_reason is required when reporting an issue" });
    }

    if (userId !== req.user.user_id) {
      return res.status(403).json({ message: "You can submit reviews only as yourself" });
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

    if (contract.client.user_id !== req.user.user_id) {
      return res.status(403).json({ message: "You can review only your own contracts" });
    }

    if (contract.status !== "completed") {
      return res.status(400).json({ message: "Review is allowed only after contract completion" });
    }

    const existingReview = await prisma.review.findFirst({
      where: {
        contract_id: contractId,
        user_id: userId,
      },
    });

    if (existingReview) {
      return res.status(409).json({ message: "Review already exists for this contract" });
    }

    const commentParts = [];
    const normalizedComment = rawComment ? String(rawComment).trim() : "";

    if (normalizedComment) {
      commentParts.push(normalizedComment);
    }

    if (reportIssue && reportReason) {
      commentParts.push(`Reported Issue: ${reportReason}`);
    }

    const comment = commentParts.length > 0 ? commentParts.join("\n\n") : null;

    const review = await prisma.review.create({
      data: {
        contract_id: contractId,
        user_id: userId,
        rating,
        comment,
      },
      include: {
        user: {
          select: {
            user_id: true,
            first_name: true,
            last_name: true,
          },
        },
      },
    });

    return res.status(201).json(withReportMeta(review));
  } catch (error) {
    return res.status(500).json({ message: "Failed to submit review", error: error.message });
  }
});

router.get("/contract/:contract_id", async (req, res) => {
  try {
    const contractId = parseId(req.params.contract_id);

    if (!contractId) {
      return res.status(400).json({ message: "Invalid contract id" });
    }

    const review = await prisma.review.findFirst({
      where: {
        contract_id: contractId,
      },
      include: {
        user: {
          select: {
            user_id: true,
            first_name: true,
            last_name: true,
          },
        },
      },
      orderBy: {
        review_id: "desc",
      },
    });

    if (!review) {
      return res.status(404).json({ message: "No review found for this contract" });
    }

    return res.status(200).json(withReportMeta(review));
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch contract review", error: error.message });
  }
});

router.get("/freelancer/:freelancer_id", async (req, res) => {
  try {
    const freelancerId = parseId(req.params.freelancer_id);

    if (!freelancerId) {
      return res.status(400).json({ message: "Invalid freelancer id" });
    }

    const reviews = await prisma.review.findMany({
      where: {
        contract: {
          freelancer_id: freelancerId,
        },
      },
      include: {
        user: {
          select: {
            user_id: true,
            first_name: true,
            last_name: true,
          },
        },
        contract: {
          include: {
            project: {
              select: {
                project_id: true,
                title: true,
              },
            },
          },
        },
      },
      orderBy: {
        review_id: "desc",
      },
    });

    return res.status(200).json(reviews.map(withReportMeta));
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch freelancer reviews", error: error.message });
  }
});

module.exports = router;
