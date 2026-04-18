const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const prisma = require("./lib/prisma");
const authRoutes = require("./routes/auth");
const profileRoutes = require("./routes/profile");
const skillsRoutes = require("./routes/skills");

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/skills", skillsRoutes);

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

startServer();
