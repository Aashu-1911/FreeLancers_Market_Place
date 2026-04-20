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

const paymentStatusValues = ["pending", "completed"];

const createPaymentValidation = [
  body("contract_id").isInt({ min: 1 }).withMessage("contract_id must be a positive integer"),
  body("amount").isFloat({ gt: 0 }).withMessage("amount must be a positive number"),
];

const updatePaymentValidation = [
  body("payment_status").isIn(paymentStatusValues).withMessage("payment_status must be pending or completed"),
];

function buildTransactionId(payment) {
  const parsedDate = new Date(payment.transaction_date || Date.now());
  const safeDate = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
  const datePart = safeDate.toISOString().slice(0, 10).replace(/-/g, "");
  const paymentPart = String(payment.payment_id || 0).padStart(6, "0");
  return `TXN-${datePart}-${paymentPart}`;
}

function withPaymentMeta(payment) {
  const status = payment.payment_status === "completed" ? "completed" : "pending";
  return {
    ...payment,
    payment_status: status,
    transaction_id: buildTransactionId(payment),
    remark: status === "completed" ? "Payment completed successfully." : "Payment is pending.",
  };
}

async function canAccessContract(contractId, user) {
  const contract = await prisma.contract.findUnique({
    where: {
      contract_id: contractId,
    },
    include: {
      client: true,
      freelancer: true,
    },
  });

  if (!contract) {
    return { allowed: false, contract: null, reason: "Contract not found", status: 404 };
  }

  if (user.role === "client" && contract.client.user_id === user.user_id) {
    return { allowed: true, contract };
  }

  if (user.role === "freelancer" && contract.freelancer.user_id === user.user_id) {
    return { allowed: true, contract };
  }

  return { allowed: false, contract, reason: "Forbidden", status: 403 };
}

router.post("/", authMiddleware, createPaymentValidation, validateRequest, async (req, res) => {
  try {
    if (req.user.role !== "client") {
      return res.status(403).json({ message: "Only clients can create payments" });
    }

    const contractId = parseId(req.body.contract_id);
    const amount = parseAmount(req.body.amount);

    if (!contractId || !amount) {
      return res.status(400).json({ message: "contract_id and amount are required" });
    }

    const access = await canAccessContract(contractId, req.user);

    if (!access.allowed) {
      return res.status(access.status).json({ message: access.reason });
    }

    if (access.contract.status !== "completed") {
      return res.status(400).json({ message: "Mark work as finished before adding payment." });
    }

    const existingCompletedPayment = await prisma.payment.findFirst({
      where: {
        contract_id: contractId,
        payment_status: "completed",
      },
    });

    if (existingCompletedPayment) {
      return res.status(409).json({ message: "Payment is already completed for this contract." });
    }

    const payment = await prisma.payment.create({
      data: {
        contract_id: contractId,
        amount,
        payment_status: "completed",
        transaction_date: new Date(),
      },
    });

    return res.status(201).json(withPaymentMeta(payment));
  } catch (error) {
    return res.status(500).json({ message: "Failed to create payment", error: error.message });
  }
});

router.get("/contract/:contract_id", authMiddleware, async (req, res) => {
  try {
    const contractId = parseId(req.params.contract_id);

    if (!contractId) {
      return res.status(400).json({ message: "Invalid contract id" });
    }

    const access = await canAccessContract(contractId, req.user);

    if (!access.allowed) {
      return res.status(access.status).json({ message: access.reason });
    }

    const payments = await prisma.payment.findMany({
      where: {
        contract_id: contractId,
      },
      orderBy: {
        transaction_date: "desc",
      },
    });

    return res.status(200).json(payments.map(withPaymentMeta));
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch payments", error: error.message });
  }
});

router.put("/:id", authMiddleware, updatePaymentValidation, validateRequest, async (req, res) => {
  try {
    if (req.user.role !== "client") {
      return res.status(403).json({ message: "Only clients can update payments" });
    }

    const paymentId = parseId(req.params.id);

    if (!paymentId) {
      return res.status(400).json({ message: "Invalid payment id" });
    }

    const nextStatus = req.body.payment_status;

    if (!nextStatus || !["pending", "completed"].includes(nextStatus)) {
      return res.status(400).json({ message: "payment_status must be pending or completed" });
    }

    const payment = await prisma.payment.findUnique({
      where: {
        payment_id: paymentId,
      },
    });

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    const access = await canAccessContract(payment.contract_id, req.user);

    if (!access.allowed) {
      return res.status(access.status).json({ message: access.reason });
    }

    if (nextStatus === "completed" && access.contract.status !== "completed") {
      return res.status(400).json({ message: "Mark work as finished before completing payment." });
    }

    const updatedPayment = await prisma.payment.update({
      where: {
        payment_id: paymentId,
      },
      data: {
        payment_status: nextStatus,
      },
    });

    return res.status(200).json(withPaymentMeta(updatedPayment));
  } catch (error) {
    return res.status(500).json({ message: "Failed to update payment", error: error.message });
  }
});

module.exports = router;
