const express = require("express");
const bcrypt = require("bcryptjs");
const prisma = require("../lib/prisma");
const { signToken } = require("../utils/jwt");

const router = express.Router();

function getRoleFromUser(user) {
  if (user.freelancer) {
    return "freelancer";
  }

  if (user.client) {
    return "client";
  }

  return null;
}

router.post("/register", async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      email,
      phone,
      city,
      pincode,
      password,
      role,
      college_name,
      degree,
      year_of_study,
      portfolio,
      resume,
      availability,
      status,
      client_type,
    } = req.body;

    if (!first_name || !last_name || !email || !password || !role) {
      return res.status(400).json({ message: "first_name, last_name, email, password, and role are required" });
    }

    const normalizedRole = String(role).toLowerCase();

    if (!["freelancer", "client"].includes(normalizedRole)) {
      return res.status(400).json({ message: "Invalid role. Use freelancer or client" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          first_name,
          last_name,
          email,
          phone: phone ?? null,
          city: city ?? null,
          pincode: pincode ?? null,
          password: hashedPassword,
        },
      });

      let freelancer = null;
      let client = null;

      if (normalizedRole === "freelancer") {
        freelancer = await tx.freelancer.create({
          data: {
            user_id: user.user_id,
            college_name: college_name ?? null,
            degree: degree ?? null,
            year_of_study: year_of_study ? Number(year_of_study) : null,
            portfolio: portfolio ?? null,
            resume: resume ?? null,
            availability: typeof availability === "boolean" ? availability : true,
            status: status ?? "active",
          },
        });
      }

      if (normalizedRole === "client") {
        client = await tx.client.create({
          data: {
            user_id: user.user_id,
            client_type: client_type ?? "individual",
          },
        });
      }

      return { user, freelancer, client };
    });

    const token = signToken({
      user_id: result.user.user_id,
      role: normalizedRole,
    });

    return res.status(201).json({
      token,
      user: {
        user_id: result.user.user_id,
        first_name: result.user.first_name,
        last_name: result.user.last_name,
        email: result.user.email,
        role: normalizedRole,
      },
      freelancer: result.freelancer,
      client: result.client,
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ message: "Email already exists" });
    }

    return res.status(500).json({ message: "Failed to register", error: error.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        freelancer: true,
        client: true,
      },
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const role = getRoleFromUser(user);

    if (!role) {
      return res.status(400).json({ message: "No valid profile found for this user" });
    }

    const token = signToken({
      user_id: user.user_id,
      role,
    });

    return res.status(200).json({
      token,
      user: {
        user_id: user.user_id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role,
      },
      freelancer: user.freelancer,
      client: user.client,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to login", error: error.message });
  }
});

module.exports = router;
