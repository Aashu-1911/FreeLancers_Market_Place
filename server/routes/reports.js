const express = require("express");
const { body, query } = require("express-validator");
const prisma = require("../lib/prisma");
const authMiddleware = require("../middleware/auth");
const validateRequest = require("../middleware/validateRequest");
const { parseTeamReviewerAllowList, isUserAllowedTeamReviewer } = require("../utils/teamReviewer");

const router = express.Router();

const reportStatusValues = ["pending", "under_review", "resolved_valid", "resolved_invalid"];
const accountStatusValues = ["active", "suspended"];

function parseId(rawId) {
  const parsed = Number(rawId);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function getSuspendThreshold() {
  const parsed = Number(process.env.REPORT_SUSPEND_THRESHOLD);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 3;
}

async function requireTeamReviewer(req, res, next) {
  try {
    const allowList = parseTeamReviewerAllowList();

    if (allowList.size === 0) {
      return res.status(403).json({
        message: "Team reviewer access is not configured. Set TEAM_REVIEWERS with usernames or emails.",
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        user_id: req.user.user_id,
      },
      select: {
        user_id: true,
        email: true,
        username: true,
      },
    });

    if (!user || !isUserAllowedTeamReviewer(user, allowList)) {
      return res.status(403).json({ message: "Only team reviewers can access this endpoint" });
    }

    req.teamReviewer = user;
    return next();
  } catch (error) {
    return res.status(500).json({ message: "Failed to verify team reviewer", error: error.message });
  }
}

const createReportValidation = [
  body("contract_id").isInt({ min: 1 }).withMessage("contract_id must be a positive integer"),
  body("reason").trim().notEmpty().withMessage("reason is required"),
  body("description").optional({ nullable: true }).trim(),
];

const listTeamReportsValidation = [
  query("status").optional().isIn(reportStatusValues).withMessage("Invalid status filter"),
  query("reported_user_id")
    .optional()
    .isInt({ min: 1 })
    .withMessage("reported_user_id must be a positive integer"),
];

const updateTeamReportValidation = [
  body("status").optional().isIn(reportStatusValues).withMessage("Invalid report status"),
  body("review_notes").optional({ nullable: true }).trim(),
];

const updateAccountStatusValidation = [
  body("account_status").isIn(accountStatusValues).withMessage("account_status must be active or suspended"),
  body("suspended_reason").optional({ nullable: true }).trim(),
];

router.post("/", authMiddleware, createReportValidation, validateRequest, async (req, res) => {
  try {
    if (req.user.role !== "freelancer") {
      return res.status(403).json({ message: "Only freelancers can submit reports" });
    }

    const contractId = parseId(req.body.contract_id);
    const reason = String(req.body.reason || "").trim();
    const description = req.body.description ? String(req.body.description).trim() : null;

    if (!contractId || !reason) {
      return res.status(400).json({ message: "contract_id and reason are required" });
    }

    const freelancer = await prisma.freelancer.findUnique({
      where: {
        user_id: req.user.user_id,
      },
      select: {
        freelancer_id: true,
        user_id: true,
      },
    });

    if (!freelancer) {
      return res.status(404).json({ message: "Freelancer profile not found" });
    }

    const contract = await prisma.contract.findUnique({
      where: {
        contract_id: contractId,
      },
      include: {
        freelancer: {
          select: {
            user_id: true,
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
              },
            },
          },
        },
        project: {
          select: {
            project_id: true,
            title: true,
          },
        },
      },
    });

    if (!contract) {
      return res.status(404).json({ message: "Contract not found" });
    }

    if (contract.freelancer.user_id !== req.user.user_id) {
      return res.status(403).json({ message: "You can report only your own contracts" });
    }

    const existingReport = await prisma.report.findFirst({
      where: {
        contract_id: contractId,
        reporter_user_id: req.user.user_id,
      },
    });

    if (existingReport) {
      return res.status(409).json({ message: "Report already submitted for this contract" });
    }

    const createdReport = await prisma.report.create({
      data: {
        contract_id: contractId,
        reporter_user_id: req.user.user_id,
        reported_user_id: contract.client.user.user_id,
        reason,
        description,
        status: "pending",
      },
      include: {
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
        reported_user: {
          select: {
            user_id: true,
            first_name: true,
            last_name: true,
            username: true,
            email: true,
          },
        },
      },
    });

    return res.status(201).json(createdReport);
  } catch (error) {
    return res.status(500).json({ message: "Failed to submit report", error: error.message });
  }
});

router.get("/contract/:contract_id", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "freelancer") {
      return res.status(403).json({ message: "Only freelancers can view contract reports" });
    }

    const contractId = parseId(req.params.contract_id);

    if (!contractId) {
      return res.status(400).json({ message: "Invalid contract id" });
    }

    const report = await prisma.report.findFirst({
      where: {
        contract_id: contractId,
        reporter_user_id: req.user.user_id,
      },
      include: {
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
        reported_user: {
          select: {
            user_id: true,
            first_name: true,
            last_name: true,
            username: true,
            email: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });

    if (!report) {
      return res.status(404).json({ message: "No report found for this contract" });
    }

    return res.status(200).json(report);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch contract report", error: error.message });
  }
});

router.get(
  "/team",
  authMiddleware,
  requireTeamReviewer,
  listTeamReportsValidation,
  validateRequest,
  async (req, res) => {
    try {
      const status = req.query.status;
      const reportedUserId = req.query.reported_user_id ? parseId(req.query.reported_user_id) : null;
      const whereClause = {};

      if (status) {
        whereClause.status = status;
      }

      if (reportedUserId) {
        whereClause.reported_user_id = reportedUserId;
      }

      const reports = await prisma.report.findMany({
        where: whereClause,
        include: {
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
          reporter: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
              username: true,
              email: true,
            },
          },
          reported_user: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
              username: true,
              email: true,
              account_status: true,
            },
          },
          reviewed_by: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
              username: true,
              email: true,
            },
          },
        },
        orderBy: {
          created_at: "desc",
        },
      });

      const reportedUserIds = [...new Set(reports.map((report) => report.reported_user_id))];
      const validCountByUserId = {};

      if (reportedUserIds.length > 0) {
        const grouped = await prisma.report.groupBy({
          by: ["reported_user_id"],
          where: {
            reported_user_id: {
              in: reportedUserIds,
            },
            status: "resolved_valid",
          },
          _count: {
            _all: true,
          },
        });

        grouped.forEach((row) => {
          validCountByUserId[row.reported_user_id] = row._count._all;
        });
      }

      const suspendThreshold = getSuspendThreshold();
      const items = reports.map((report) => {
        const validReportCount = Number(validCountByUserId[report.reported_user_id] || 0);

        return {
          ...report,
          valid_report_count: validReportCount,
          suspend_threshold: suspendThreshold,
          eligible_for_auto_suspend: validReportCount >= suspendThreshold,
        };
      });

      return res.status(200).json({
        items,
        suspend_threshold: suspendThreshold,
      });
    } catch (error) {
      return res.status(500).json({ message: "Failed to fetch team reports", error: error.message });
    }
  }
);

router.patch(
  "/team/:report_id",
  authMiddleware,
  requireTeamReviewer,
  updateTeamReportValidation,
  validateRequest,
  async (req, res) => {
    try {
      const reportId = parseId(req.params.report_id);
      const status = req.body.status;
      const reviewNotes = req.body.review_notes;

      if (!reportId) {
        return res.status(400).json({ message: "Invalid report id" });
      }

      if (typeof status === "undefined" && typeof reviewNotes === "undefined") {
        return res.status(400).json({ message: "Provide status or review_notes to update report" });
      }

      const existingReport = await prisma.report.findUnique({
        where: {
          report_id: reportId,
        },
      });

      if (!existingReport) {
        return res.status(404).json({ message: "Report not found" });
      }

      const updateData = {};

      if (typeof status !== "undefined") {
        updateData.status = status;
        updateData.reviewed_by_user_id = req.user.user_id;
        updateData.reviewed_at = new Date();
      }

      if (typeof reviewNotes !== "undefined") {
        updateData.review_notes = reviewNotes ? String(reviewNotes).trim() : null;
      }

      const updatedReport = await prisma.report.update({
        where: {
          report_id: reportId,
        },
        data: updateData,
        include: {
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
          reporter: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
              username: true,
              email: true,
            },
          },
          reported_user: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
              username: true,
              email: true,
              account_status: true,
            },
          },
          reviewed_by: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
              username: true,
              email: true,
            },
          },
        },
      });

      let suspensionResult = null;

      if (status === "resolved_valid") {
        const validReportCount = await prisma.report.count({
          where: {
            reported_user_id: updatedReport.reported_user_id,
            status: "resolved_valid",
          },
        });

        const suspendThreshold = getSuspendThreshold();

        if (validReportCount >= suspendThreshold) {
          const suspendedUser = await prisma.user.update({
            where: {
              user_id: updatedReport.reported_user_id,
            },
            data: {
              account_status: "suspended",
              suspended_reason: `Suspended after ${validReportCount} validated reports for improper behavior.`,
              suspended_at: new Date(),
            },
            select: {
              user_id: true,
              account_status: true,
              suspended_reason: true,
              suspended_at: true,
            },
          });

          suspensionResult = {
            auto_suspended: true,
            threshold: suspendThreshold,
            valid_report_count: validReportCount,
            user: suspendedUser,
          };
        } else {
          suspensionResult = {
            auto_suspended: false,
            threshold: suspendThreshold,
            valid_report_count: validReportCount,
          };
        }
      }

      return res.status(200).json({
        report: updatedReport,
        suspension: suspensionResult,
      });
    } catch (error) {
      return res.status(500).json({ message: "Failed to update report", error: error.message });
    }
  }
);

router.patch(
  "/team/users/:user_id/account-status",
  authMiddleware,
  requireTeamReviewer,
  updateAccountStatusValidation,
  validateRequest,
  async (req, res) => {
    try {
      const userId = parseId(req.params.user_id);

      if (!userId) {
        return res.status(400).json({ message: "Invalid user id" });
      }

      const nextStatus = req.body.account_status;
      const suspendedReason = req.body.suspended_reason ? String(req.body.suspended_reason).trim() : null;

      const updateData = {
        account_status: nextStatus,
      };

      if (nextStatus === "suspended") {
        updateData.suspended_at = new Date();
        updateData.suspended_reason = suspendedReason || "Suspended after team review.";
      } else {
        updateData.suspended_at = null;
        updateData.suspended_reason = null;
      }

      const updatedUser = await prisma.user.update({
        where: {
          user_id: userId,
        },
        data: updateData,
        select: {
          user_id: true,
          first_name: true,
          last_name: true,
          username: true,
          email: true,
          account_status: true,
          suspended_reason: true,
          suspended_at: true,
        },
      });

      return res.status(200).json(updatedUser);
    } catch (error) {
      if (error.code === "P2025") {
        return res.status(404).json({ message: "User not found" });
      }

      return res.status(500).json({ message: "Failed to update user account status", error: error.message });
    }
  }
);

module.exports = router;
