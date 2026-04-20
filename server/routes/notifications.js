const express = require("express");
const prisma = require("../lib/prisma");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

function buildTransactionId(payment) {
  const parsedDate = new Date(payment.transaction_date || Date.now());
  const safeDate = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
  const datePart = safeDate.toISOString().slice(0, 10).replace(/-/g, "");
  const paymentPart = String(payment.payment_id || 0).padStart(6, "0");
  return `TXN-${datePart}-${paymentPart}`;
}

function sortByNewest(items) {
  return [...items].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

router.get("/", authMiddleware, async (req, res) => {
  try {
    const notifications = [];

    if (req.user.role === "client") {
      const client = await prisma.client.findUnique({
        where: {
          user_id: req.user.user_id,
        },
      });

      if (!client) {
        return res.status(200).json({ items: [], unread_count: 0 });
      }

      const contracts = await prisma.contract.findMany({
        where: {
          client_id: client.client_id,
        },
        include: {
          project: {
            select: {
              project_id: true,
              title: true,
            },
          },
          freelancer: {
            include: {
              user: {
                select: {
                  first_name: true,
                  last_name: true,
                },
              },
            },
          },
          payments: {
            orderBy: {
              transaction_date: "desc",
            },
            take: 1,
          },
        },
      });

      contracts.forEach((contract) => {
        const latestPayment = contract.payments[0] || null;

        notifications.push({
          id: `application-accepted-${contract.contract_id}`,
          type: "success",
          title: "Application Accepted",
          message: `Your application was accepted for ${contract.project.title}.`,
          created_at: contract.start_date,
          contract_id: contract.contract_id,
        });

        notifications.push({
          id: `contract-${contract.contract_id}`,
          type: "info",
          title: "Contract Formed",
          message: `Contract formed for ${contract.project.title}.`,
          created_at: contract.start_date,
          contract_id: contract.contract_id,
        });

        if (contract.status === "completed" && (!latestPayment || latestPayment.payment_status !== "completed")) {
          notifications.push({
            id: `payment-pending-${contract.contract_id}`,
            type: "warning",
            title: "Payment Pending",
            message: `Work is finished for ${contract.project.title}. Please complete payment.`,
            created_at: contract.end_date || contract.start_date,
            contract_id: contract.contract_id,
          });
        }

        if (latestPayment && latestPayment.payment_status === "completed") {
          notifications.push({
            id: `payment-complete-${latestPayment.payment_id}`,
            type: "success",
            title: "Payment Completed",
            message: `Payment ${buildTransactionId(latestPayment)} completed for ${contract.project.title}.`,
            created_at: latestPayment.transaction_date,
            contract_id: contract.contract_id,
          });
        }
      });
    }

    if (req.user.role === "freelancer") {
      const freelancer = await prisma.freelancer.findUnique({
        where: {
          user_id: req.user.user_id,
        },
      });

      if (!freelancer) {
        return res.status(200).json({ items: [], unread_count: 0 });
      }

      const contracts = await prisma.contract.findMany({
        where: {
          freelancer_id: freelancer.freelancer_id,
        },
        include: {
          project: {
            select: {
              project_id: true,
              title: true,
            },
          },
          client: {
            include: {
              user: {
                select: {
                  first_name: true,
                  last_name: true,
                },
              },
            },
          },
          payments: {
            orderBy: {
              transaction_date: "desc",
            },
            take: 1,
          },
        },
      });

      contracts.forEach((contract) => {
        const latestPayment = contract.payments[0] || null;

        notifications.push({
          id: `contract-${contract.contract_id}`,
          type: "info",
          title: "Contract Formed",
          message: `Contract formed for ${contract.project.title}.`,
          created_at: contract.start_date,
          contract_id: contract.contract_id,
        });

        if (contract.status === "completed" && (!latestPayment || latestPayment.payment_status !== "completed")) {
          notifications.push({
            id: `awaiting-payment-${contract.contract_id}`,
            type: "warning",
            title: "Awaiting Payment",
            message: `Client marked work finished for ${contract.project.title}. Payment is pending.`,
            created_at: contract.end_date || contract.start_date,
            contract_id: contract.contract_id,
          });
        }

        if (latestPayment && latestPayment.payment_status === "completed") {
          notifications.push({
            id: `payment-received-${latestPayment.payment_id}`,
            type: "success",
            title: "Payment Received",
            message: `Payment ${buildTransactionId(latestPayment)} received for ${contract.project.title}.`,
            created_at: latestPayment.transaction_date,
            contract_id: contract.contract_id,
          });
        }
      });
    }

    const items = sortByNewest(notifications).slice(0, 25);
    return res.status(200).json({ items, unread_count: items.length });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch notifications", error: error.message });
  }
});

module.exports = router;
