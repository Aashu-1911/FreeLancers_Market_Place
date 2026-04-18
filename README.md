# SkillHire

SkillHire is a full-stack freelance marketplace platform built with:

- Backend: Node.js, Express, Prisma, PostgreSQL
- Frontend: React, Vite, Tailwind CSS
- Auth: JWT

## Project Structure

- server: API, auth, business logic, Prisma
- client: React UI and routing

## Local Setup

### 1. Clone and install dependencies

Backend:

```bash
cd server
npm install
```

Frontend:

```bash
cd client
npm install
```

### 2. Configure environment variables

Backend file: `server/.env`

```env
PORT=5000
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/skillhire?schema=public
JWT_SECRET=replace_with_a_strong_secret
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
```

Frontend file: `client/.env`

```env
VITE_API_URL=http://localhost:5000
```

### 3. Prisma setup

```bash
cd server
npx prisma generate
npx prisma migrate dev
```

### 4. Run the app

Backend:

```bash
cd server
npm run dev
```

Frontend:

```bash
cd client
npm run dev
```

### 5. Verify

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:5000/health`

## API Documentation

Base URL: `http://localhost:5000`

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`

### Profile

- `GET /api/profile/freelancer/:id`
- `PUT /api/profile/freelancer/:id`
- `GET /api/profile/client/:id`
- `PUT /api/profile/client/:id`

### Skills

- `GET /api/skills`
- `POST /api/skills`
- `POST /api/skills/assign`
- `DELETE /api/skills/remove`

### Projects

- `POST /api/projects`
- `GET /api/projects`
- `GET /api/projects/:id`
- `GET /api/projects/client/:client_id`
- `PUT /api/projects/:id`
- `DELETE /api/projects/:id`

### Applications

- `POST /api/applications`
- `GET /api/applications/project/:project_id`
- `GET /api/applications/freelancer/:freelancer_id`
- `DELETE /api/applications/:id`

### Contracts

- `POST /api/contracts`
- `GET /api/contracts/:id`
- `GET /api/contracts/freelancer/:freelancer_id`
- `GET /api/contracts/client/:client_id`
- `PUT /api/contracts/:id/status`

### Payments

- `POST /api/payments`
- `GET /api/payments/contract/:contract_id`
- `PUT /api/payments/:id`

### Reviews

- `POST /api/reviews`
- `GET /api/reviews/contract/:contract_id`
- `GET /api/reviews/freelancer/:freelancer_id`

### Platform Stats

- `GET /api/stats/overview`

## Security and Validation

Backend includes:

- `express-validator` for POST/PUT validation
- `helmet` for secure HTTP headers
- `express-rate-limit` on API routes
- CORS restricted to configured frontend URL
- Global error handler format:

```json
{
  "success": false,
  "message": "...",
  "errors": []
}
```

## Deployment

## Backend (Railway or Render)

1. Create a new service from `server` folder.
2. Set environment variables:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `PORT`
   - `FRONTEND_URL` (your Vercel frontend URL)
3. Build/Start commands:
   - Build: `npm install && npx prisma generate`
   - Start: `npm start`
4. Run database migrations on production DB:

```bash
npx prisma migrate deploy
```

## Frontend (Vercel)

1. Import the `client` folder as project root.
2. Set environment variable:
   - `VITE_API_URL=https://your-backend-domain`
3. Build command: `npm run build`
4. Output directory: `dist`

## End-to-End Test Flow

Use this sequence after deployment:

1. Register a client account
2. Register a freelancer account
3. Client posts a project
4. Freelancer applies to project
5. Client hires freelancer (creates contract)
6. Client marks contract completed
7. Client submits review
8. Client adds payment and marks payment completed

## Useful Commands

Backend:

```bash
npm run dev
npm start
npx prisma generate
npx prisma migrate dev
npx prisma migrate deploy
```

Frontend:

```bash
npm run dev
npm run build
npm run preview
```
