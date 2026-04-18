const express = require("express");
const prisma = require("../lib/prisma");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

function parseId(rawId) {
  const parsed = Number(rawId);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseRating(rawRating) {
  const parsed = Number(rawRating);
  return Number.isInteger(parsed) ? parsed : null;
}

router.post("/", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "client") {
      return res.status(403).json({ message: "Only clients can submit reviews" });
    }

    const contractId = parseId(req.body.contract_id);
    const userId = parseId(req.body.user_id);
    const rating = parseRating(req.body.rating);
    const comment = req.body.comment ?? null;

    if (!contractId || !userId || !rating) {
      return res.status(400).json({ message: "contract_id, user_id, and rating are required" });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: "rating must be between 1 and 5" });
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

    return res.status(201).json(review);
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

    return res.status(200).json(review);
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

    return res.status(200).json(reviews);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch freelancer reviews", error: error.message });
  }
});

module.exports = router;
