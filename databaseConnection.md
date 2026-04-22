# Database Connection and Data Flow (PostgreSQL + Prisma)

This project uses PostgreSQL as the database and Prisma as the ORM (Object-Relational Mapper).

## 1. How PostgreSQL is connected to this project

### Environment connection string
The backend reads PostgreSQL connection details from `DATABASE_URL` in `server/.env`:

```env
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/skillhire?schema=public
```

### Prisma datasource
In `server/prisma/schema.prisma`, Prisma is configured for PostgreSQL:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### Prisma client instance
In `server/lib/prisma.js`, a single Prisma client is created and reused:

```js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
module.exports = prisma;
```

### Server startup DB check
In `server/server.js`:
- `await prisma.$connect()` connects at startup.
- `/health` runs `SELECT 1` using `prisma.$queryRaw` to verify DB connectivity.

## 2. What queries were performed while creating the project (schema setup)

When setting up the project, Prisma migrations generated and executed SQL against PostgreSQL.

### Initial migration (core tables and relations)
The first migration created major tables:
- User
- Freelancer
- Client
- Skill
- FreelancerSkill
- Project
- Application
- Contract
- Review
- Payment

It also created:
- Primary keys (`SERIAL`, `PRIMARY KEY`)
- Unique indexes (email, username, composite uniques, etc.)
- Foreign keys with `ON DELETE CASCADE`

### Later migrations (schema evolution)
Additional migrations altered schema over time, including:
- Added `Project.tech_stack` and created `ProjectSkill` table
- Added `Contract.contract_scope` and `Contract.task_description`
- Added `User.username` with backfill query:

```sql
UPDATE "User"
SET "username" = CONCAT('user', "user_id")
WHERE "username" IS NULL;
```

- Added `User.profile_picture`
- Added project location/work arrangement columns: `work_mode`, `engagement_type`, `address`, `area`
- Added `Client.portfolio` and `Client.resume`

## 3. Runtime queries while creating a Project post in the app

When a client posts a project (API: `POST /api/projects`), backend route logic in `server/routes/projects.js` runs these DB operations:

1. Validate required skill IDs exist:

```js
prisma.skill.count({ where: { skill_id: { in: skillIds } } })
```

2. Resolve current client profile by logged-in user:

```js
prisma.client.findUnique({ where: { user_id: req.user.user_id } })
```

3. Insert project with nested required skills (if provided):

```js
prisma.project.create({
  data: {
    client_id,
    title,
    description,
    budget,
    work_mode,
    engagement_type,
    address,
    area,
    tech_stack,
    deadline,
    project_status,
    requiredSkills: {
      create: [{ skill_id: 1 }, { skill_id: 2 }]
    }
  },
  include: {
    client: { include: { user: true } },
    requiredSkills: { include: { skill: true } }
  }
})
```

Equivalent SQL conceptually includes:
- `INSERT INTO "Project" (...) VALUES (...);`
- `INSERT INTO "ProjectSkill" (project_id, skill_id) VALUES (...);`

## 4. How frontend fetches data from PostgreSQL

Frontend does not connect to PostgreSQL directly.

Flow is:
1. React pages call backend APIs using Axios (`client/src/lib/api.js`)
2. Backend Express routes receive requests (for example `/api/projects`, `/api/contracts`)
3. Route handlers execute Prisma queries
4. Prisma translates those queries to SQL and executes them on PostgreSQL
5. Backend returns JSON response to frontend

### Frontend API client behavior
`client/src/lib/api.js`:
- Sets `baseURL` from `VITE_API_URL` (defaults to `http://localhost:5000`)
- Adds JWT token in `Authorization: Bearer <token>` for authenticated requests
- Uses interceptors for request/response loading state

### Example from Manage Projects page
`client/src/pages/ManageProjectsPage.jsx` fetches:
- Client profile: `GET /api/profile/client/:user_id`
- Client projects: `GET /api/projects/client/:client_id`
- Applicants for selected project: `GET /api/applications/project/:project_id`

Those endpoints then use Prisma (`findUnique`, `findMany`, `include`, `orderBy`) to read PostgreSQL data.

## 5. What is Prisma and what is its role in this project

Prisma is the data access layer between Node.js and PostgreSQL.

Its role here:
- Defines database schema in one place (`schema.prisma`)
- Generates typed Prisma Client (`@prisma/client`)
- Manages schema changes through migrations (`prisma migrate dev`)
- Performs CRUD operations from route handlers (`create`, `findUnique`, `findMany`, `update`, `delete`, `count`)
- Handles transactions for multi-step atomic operations (`prisma.$transaction`)
- Supports relational loading with `include` and filtering/sorting in queries

In short:
- PostgreSQL stores the data
- Prisma is the safe/query layer
- Express exposes API endpoints
- React frontend consumes those endpoints
