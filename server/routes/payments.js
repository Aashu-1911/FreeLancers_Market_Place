const express = require("express");
const prisma = require("../lib/prisma");
const authMiddleware = require("../middleware/auth");

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

router.post("/", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "client") {
      return res.status(403).json({ message: "Only clients can create payments" });
    }

    const contractId = parseId(req.body.contract_id);
    const amount = parseAmount(req.body.amount);
    const paymentStatus = req.body.payment_status || "pending";
    const transactionDate = req.body.transaction_date ? parseDate(req.body.transaction_date) : new Date();

    if (!contractId || !amount) {
      return res.status(400).json({ message: "contract_id and amount are required" });
    }

    if (!transactionDate) {
      return res.status(400).json({ message: "Invalid transaction_date" });
    }

    if (!["pending", "completed"].includes(paymentStatus)) {
      return res.status(400).json({ message: "payment_status must be pending or completed" });
    }

    const access = await canAccessContract(contractId, req.user);

    if (!access.allowed) {
      return res.status(access.status).json({ message: access.reason });
    }

    const payment = await prisma.payment.create({
      data: {
        contract_id: contractId,
        amount,
        payment_status: paymentStatus,
        transaction_date: transactionDate,
      },
    });

    return res.status(201).json(payment);
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

    return res.status(200).json(payments);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch payments", error: error.message });
  }
});

router.put("/:id", authMiddleware, async (req, res) => {
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

    const updatedPayment = await prisma.payment.update({
      where: {
        payment_id: paymentId,
      },
      data: {
        payment_status: nextStatus,
      },
    });

    return res.status(200).json(updatedPayment);
  } catch (error) {
    return res.status(500).json({ message: "Failed to update payment", error: error.message });
  }
});

module.exports = router;
