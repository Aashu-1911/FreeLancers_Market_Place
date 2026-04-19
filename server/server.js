const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const fs = require("fs");
const helmet = require("helmet");
const path = require("path");
const rateLimit = require("express-rate-limit");
const prisma = require("./lib/prisma");
const authRoutes = require("./routes/auth");
const profileRoutes = require("./routes/profile");
const skillsRoutes = require("./routes/skills");
const projectRoutes = require("./routes/projects");
const applicationRoutes = require("./routes/applications");
const contractRoutes = require("./routes/contracts");
const paymentRoutes = require("./routes/payments");
const reviewRoutes = require("./routes/reviews");
const statsRoutes = require("./routes/stats");
const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || process.env.CORS_ORIGIN || "http://localhost:5173";
const uploadsDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests, please try again later.",
    errors: [],
  },
});

app.set("trust proxy", 1);
app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || origin === FRONTEND_URL) {
        return callback(null, true);
      }

      return callback(new Error("CORS policy does not allow this origin"));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use("/uploads", express.static(uploadsDir));
app.use("/api", apiLimiter);

app.use((req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = (payload) => {
    if (res.statusCode >= 400 && payload && typeof payload === "object" && !Array.isArray(payload)) {
      const normalizedPayload = {
        success: false,
        message: payload.message || "Request failed",
        errors: Array.isArray(payload.errors)
          ? payload.errors
          : payload.error
            ? [payload.error]
            : [],
      };

      return originalJson(normalizedPayload);
    }

    return originalJson(payload);
  };

  return next();
});

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/skills", skillsRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/contracts", contractRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/stats", statsRoutes);

app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.status(200).json({ status: "ok", db: "connected" });
  } catch (error) {
    return res.status(500).json({ status: "error", db: "disconnected", error: error.message });
  }
});

async function startServer() {
  try {
    await prisma.$connect();
    app.listen(PORT, () => {
      console.log(`SkillHire server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
}

app.use(notFoundHandler);
app.use(errorHandler);

startServer();
