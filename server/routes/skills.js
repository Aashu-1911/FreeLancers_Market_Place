const express = require("express");
const { body } = require("express-validator");
const prisma = require("../lib/prisma");
const authMiddleware = require("../middleware/auth");
const validateRequest = require("../middleware/validateRequest");

const router = express.Router();

const DEFAULT_SKILL_NAMES = [
  "Web Developer",
  "JavaScript",
  "TypeScript",
  "React",
  "Next.js",
  "Vue.js",
  "Angular",
  "Node.js",
  "Express.js",
  "NestJS",
  "Python",
  "Django",
  "Flask",
  "FastAPI",
  "Java",
  "Spring Boot",
  "C#",
  ".NET",
  "PHP",
  "Laravel",
  "Go",
  "Rust",
  "Ruby on Rails",
  "Kotlin",
  "Swift",
  "Dart",
  "Flutter",
  "React Native",
  "HTML5",
  "CSS3",
  "Tailwind CSS",
  "Bootstrap",
  "SASS",
  "UI Design",
  "UX Research",
  "Figma",
  "Adobe XD",
  "Wireframing",
  "Prototyping",
  "Graphic Design",
  "Logo Design",
  "Branding",
  "Content Writing",
  "Copywriting",
  "Technical Writing",
  "SEO",
  "Social Media Marketing",
  "Email Marketing",
  "Google Ads",
  "Facebook Ads",
  "Market Research",
  "Product Management",
  "Project Management",
  "Agile Methodology",
  "Scrum",
  "Business Analysis",
  "Data Analysis",
  "Microsoft Excel",
  "SQL",
  "PostgreSQL",
  "MySQL",
  "MongoDB",
  "Redis",
  "Firebase",
  "Supabase",
  "Prisma ORM",
  "REST API Development",
  "GraphQL",
  "API Integration",
  "Microservices",
  "Docker",
  "Kubernetes",
  "AWS",
  "Microsoft Azure",
  "Google Cloud Platform",
  "CI/CD",
  "Git",
  "GitHub Actions",
  "Linux Administration",
  "Cybersecurity",
  "Penetration Testing",
  "QA Testing",
  "Automation Testing",
  "Selenium",
  "Jest",
  "Cypress",
  "Unit Testing",
  "Mobile App Testing",
  "DevOps Engineering",
  "Machine Learning",
  "Deep Learning",
  "Data Visualization",
  "Power BI",
  "Tableau",
  "Video Editing",
  "Motion Graphics",
  "WordPress",
  "Shopify",
  "WooCommerce",
  "Customer Support",
  "Communication",
  "Public Speaking",
  "Presentation Skills",
  "Negotiation",
  "Conflict Resolution",
  "Active Listening",
  "Teamwork",
  "Collaboration",
  "Leadership",
  "Decision Making",
  "Problem Solving",
  "Critical Thinking",
  "Creative Thinking",
  "Adaptability",
  "Time Management",
  "Prioritization",
  "Organization",
  "Attention to Detail",
  "Emotional Intelligence",
  "Stress Management",
  "Interpersonal Skills",
  "Networking",
  "Relationship Building",
  "Client Management",
  "Stakeholder Management",
  "Account Management",
  "Sales",
  "Lead Generation",
  "Cold Calling",
  "Customer Success",
  "Customer Onboarding",
  "Customer Retention",
  "Complaint Handling",
  "Virtual Assistance",
  "Data Entry",
  "Transcription",
  "Proofreading",
  "Editing",
  "Translation",
  "Localization",
  "Voice Over",
  "Script Writing",
  "Blog Writing",
  "Storytelling",
  "Event Planning",
  "Travel Planning",
  "Calendar Management",
  "Meeting Coordination",
  "Operations Management",
  "Process Improvement",
  "Quality Assurance",
  "Inventory Management",
  "Procurement",
  "Supply Chain Management",
  "Vendor Management",
  "Human Resources",
  "Talent Acquisition",
  "Recruitment",
  "Interviewing",
  "Training and Development",
  "Coaching",
  "Mentoring",
  "Performance Management",
  "Payroll Management",
  "Bookkeeping",
  "Financial Reporting",
  "Budgeting",
  "Cost Control",
  "Risk Management",
  "Compliance Management",
  "Legal Research",
  "Contract Drafting",
  "Administrative Support",
  "Office Management",
  "Research Skills",
  "Survey Design",
  "Community Management",
  "Social Media Management",
  "Brand Strategy",
  "Campaign Management",
  "Public Relations",
  "Media Outreach",
  "Influencer Outreach",
  "Telecalling",
  "Appointment Setting",
  "Tutoring",
  "Curriculum Development",
  "Instructional Design",
  "Career Counseling",
  "Health Coaching",
  "Fitness Training",
  "Nutrition Planning",
  "Photography",
  "Photo Retouching",
  "Fashion Styling",
  "Interior Design",
  "Architecture Drafting",
  "Real Estate Consulting",
  "Hospitality Management",
  "Restaurant Management",
  "Retail Management",
];

let didSeedDefaultSkills = false;

async function ensureDefaultSkills() {
  if (didSeedDefaultSkills) {
    return;
  }

  await prisma.skill.createMany({
    data: DEFAULT_SKILL_NAMES.map((skillName) => ({
      skill_name: skillName,
      description: null,
    })),
    skipDuplicates: true,
  });

  didSeedDefaultSkills = true;
}

function parseId(rawId) {
  const parsed = Number(rawId);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

const createSkillValidation = [
  body("skill_name").trim().notEmpty().withMessage("skill_name is required"),
  body("description").optional({ nullable: true }).trim(),
];

const assignSkillValidation = [
  body("freelancer_id").isInt({ min: 1 }).withMessage("freelancer_id must be a positive integer"),
  body("skill_id").isInt({ min: 1 }).withMessage("skill_id must be a positive integer"),
];

router.get("/", async (_req, res) => {
  try {
    await ensureDefaultSkills();

    const skills = await prisma.skill.findMany({
      orderBy: {
        skill_name: "asc",
      },
    });

    return res.status(200).json(skills);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch skills", error: error.message });
  }
});

router.post("/", authMiddleware, createSkillValidation, validateRequest, async (req, res) => {
  try {
    const { skill_name, description } = req.body;

    if (!skill_name) {
      return res.status(400).json({ message: "skill_name is required" });
    }

    const skill = await prisma.skill.create({
      data: {
        skill_name,
        description: description ?? null,
      },
    });

    return res.status(201).json(skill);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ message: "Skill already exists" });
    }

    return res.status(500).json({ message: "Failed to create skill", error: error.message });
  }
});

router.post("/assign", authMiddleware, assignSkillValidation, validateRequest, async (req, res) => {
  try {
    const freelancerId = parseId(req.body.freelancer_id);
    const skillId = parseId(req.body.skill_id);

    if (!freelancerId || !skillId) {
      return res.status(400).json({ message: "freelancer_id and skill_id are required" });
    }

    if (req.user.role === "freelancer") {
      const ownFreelancer = await prisma.freelancer.findUnique({
        where: {
          user_id: req.user.user_id,
        },
      });

      if (!ownFreelancer || ownFreelancer.freelancer_id !== freelancerId) {
        return res.status(403).json({ message: "You can assign skills only to your own profile" });
      }
    }

    const assignment = await prisma.freelancerSkill.create({
      data: {
        freelancer_id: freelancerId,
        skill_id: skillId,
      },
      include: {
        skill: true,
      },
    });

    return res.status(201).json(assignment);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ message: "Skill is already assigned to this freelancer" });
    }

    if (error.code === "P2003") {
      return res.status(404).json({ message: "Freelancer or skill not found" });
    }

    return res.status(500).json({ message: "Failed to assign skill", error: error.message });
  }
});

router.delete("/remove", authMiddleware, async (req, res) => {
  try {
    const freelancerId = parseId(req.body.freelancer_id);
    const skillId = parseId(req.body.skill_id);

    if (!freelancerId || !skillId) {
      return res.status(400).json({ message: "freelancer_id and skill_id are required" });
    }

    if (req.user.role === "freelancer") {
      const ownFreelancer = await prisma.freelancer.findUnique({
        where: {
          user_id: req.user.user_id,
        },
      });

      if (!ownFreelancer || ownFreelancer.freelancer_id !== freelancerId) {
        return res.status(403).json({ message: "You can remove skills only from your own profile" });
      }
    }

    const removalResult = await prisma.freelancerSkill.deleteMany({
      where: {
        freelancer_id: freelancerId,
        skill_id: skillId,
      },
    });

    if (removalResult.count === 0) {
      return res.status(404).json({ message: "Skill assignment not found" });
    }

    return res.status(200).json({ message: "Skill removed successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to remove skill", error: error.message });
  }
});

module.exports = router;
