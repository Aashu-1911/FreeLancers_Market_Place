# SkillHire Project Documentation (about.md)

## 1) What We Have Built

SkillHire is a full-stack freelance marketplace where clients and freelancers can work together end-to-end:

- Clients can register, manage their profile, post projects, review applicants, hire freelancers, manage contracts, track payments, and submit reviews.
- Freelancers can register, manage their profile and skills, browse projects, apply to projects, track applications, manage contracts, and view reviews.
- The platform supports transparent workflow stages from project posting to payment completion and feedback.

This project is implemented as a monorepo with:

- Frontend: React + Vite + Tailwind CSS
- Backend: Node.js + Express
- Database: PostgreSQL via Prisma ORM
- Authentication: JWT-based auth

## 2) High-Level Architecture

## 2.1 Monorepo Structure

- client: React UI, role-based routes, API integration, forms, modals, dashboards
- server: REST API, auth, validations, business rules, Prisma access layer

## 2.2 Runtime Flow

1. Frontend calls backend endpoints using Axios client.
2. Axios automatically attaches JWT token from localStorage when available.
3. Backend verifies token in auth middleware for protected endpoints.
4. Backend applies role checks and ownership checks.
5. Prisma executes queries/transactions on PostgreSQL.
6. Frontend updates UI state, shows toasts/messages, and renders role-specific screens.

## 2.3 Frontend State Layers

- AuthContext
  - Stores token and user in memory/localStorage
  - Decodes JWT payload (user_id, role, username)
  - Exposes login/logout and isAuthenticated
- LoadingContext
  - Global active request counter
  - Integrated with Axios request/response interceptors
  - Drives global loading overlay spinner

## 2.4 Security + API Hardening

Backend includes:

- helmet for secure HTTP headers
- express-rate-limit on all /api routes
- CORS allowlist via FRONTEND_URL/CORS_ORIGIN
- express-validator for request body validation
- centralized error shape normalization and error handlers
- JWT verification for protected APIs

## 3) Technology Stack

## 3.1 Frontend

- React 19
- React Router v6
- Axios
- Tailwind CSS
- react-hot-toast
- Vite

## 3.2 Backend

- Node.js + Express
- Prisma Client + Prisma Migrate
- PostgreSQL
- bcryptjs for password hashing
- jsonwebtoken for JWT auth
- express-validator

## 4) Database Design (Prisma Models)

Core entities:

- User: base identity and shared profile fields
- Freelancer: freelancer-specific profile (education, portfolio, resume, availability)
- Client: client-specific profile (client_type)
- Skill: skill catalog
- FreelancerSkill: many-to-many between Freelancer and Skill
- Project: client-posted jobs with budget, deadline, tech stack, status
- ProjectSkill: many-to-many between Project and Skill
- Application: freelancer applications to projects (unique per project/freelancer pair)
- Contract: hiring agreement between client and freelancer for a project
- Payment: payment records per contract
- Review: client feedback for completed contracts

Important integrity constraints:

- username and email are unique
- one freelancer profile or one client profile per user (unique user_id in role tables)
- unique freelancer skill assignment
- unique project skill assignment
- unique application per project/freelancer
- cascading deletes on linked records via Prisma relations

## 5) Authentication and Authorization

## 5.1 Auth

- Register endpoint creates User + role-specific record (Freelancer or Client) in a transaction.
- Passwords are hashed with bcrypt.
- JWT includes user_id, role, username.
- Login validates credentials and resolves role from related profile.

## 5.2 Route Protection (Frontend)

- PrivateRoute guards protected pages.
- Unauthenticated users are redirected to /login.
- Users with wrong role are redirected to their own profile route.
- Shared protected route exists for both roles: /contracts/:id.

## 5.3 Landing Redirect Behavior

- Root / redirects:
  - authenticated client -> /dashboard/client
  - authenticated freelancer -> /dashboard/freelancer
  - unauthenticated users -> /home
- /home also redirects authenticated users to role dashboard.

This prevents logged-in users from staying on the public landing page.

## 6) Complete Frontend Route Map

Public:

- / -> redirects by auth state
- /home -> HomePage (public landing for guests)
- /projects -> ProjectListPage
- /projects/:id -> ProjectDetailPage
- /register -> RegisterPage
- /login -> LoginPage

Freelancer-only (PrivateRoute allowedRoles=[freelancer]):

- /dashboard/freelancer -> FreelancerDashboard
- /freelancer/profile -> FreelancerProfilePage
- /freelancer/applications -> MyApplicationsPage
- /freelancer/contracts -> FreelancerContractsPage

Client-only (PrivateRoute allowedRoles=[client]):

- /dashboard/client -> ClientDashboard
- /client/profile -> ClientProfilePage
- /post-project and /projects/post -> PostProjectPage
- /client/manage-projects -> ManageProjectsPage
- /client/contracts -> ClientContractsPage

Both roles:

- /contracts/:id -> ContractPage

Fallback:

- * -> NotFound

## 7) Feature-by-Feature Explanation

## 7.1 Home and Platform Visibility

HomePage:

- Displays product value proposition and CTA buttons.
- Fetches live platform stats from GET /api/stats/overview.
- Shows total projects and total freelancers.
- CTA behavior:
  - Find Work -> /projects
  - Post a Project -> /post-project for client users, /register otherwise

## 7.2 User Registration and Login

RegisterPage:

- Supports role selection (freelancer or client).
- Collects core fields and validates input.
- Sends POST /api/auth/register.
- After success, stores token/user via AuthContext and navigates by role.

LoginPage:

- Accepts email/password with validation.
- Sends POST /api/auth/login.
- On success, stores auth and redirects to intended/private destination.

## 7.3 Role-Aware Navigation

Navbar:

- Always shows Home + Projects.
- Shows Register/Login for guests.
- Shows role-specific navigation for authenticated users.
- Displays @username and optional full name.
- Provides logout action.

## 7.4 Freelancer Profile and Skills Management

FreelancerProfilePage:

- Loads current freelancer profile via GET /api/profile/freelancer/:id.
- Loads master skills list via GET /api/skills.
- Updates profile via PUT /api/profile/freelancer/:id.
- Adds skill via POST /api/skills/assign.
- Removes skill via DELETE /api/skills/remove (with freelancer_id + skill_id in body).
- Supports education, portfolio, resume, availability, and status fields.

Backend guardrails:

- Freelancers can only edit their own profile.
- Freelancers can only assign/remove skills for themselves.

## 7.5 Client Profile Management

ClientProfilePage:

- Loads profile via GET /api/profile/client/:id.
- Updates profile via PUT /api/profile/client/:id.
- Supports personal fields and client_type.

Backend guardrails:

- Clients can edit only their own profile.

## 7.6 Project Discovery (Freelancer-Facing + Public)

ProjectListPage:

- Loads open projects via GET /api/projects.
- Supports search/filter in UI.

Backend ranking feature:

- If request has freelancer JWT, backend computes match metadata based on freelancer skills:
  - required_skills_count
  - matched_skills_count
  - matched_skill_ids
  - has_skill_match
  - match_score
- Projects are ranked by match first, then score, then recency.

ProjectDetailPage:

- Fetches project detail via GET /api/projects/:id.
- For freelancers, checks own profile + existing applications to determine apply state.
- Allows freelancer application submission via POST /api/applications.

## 7.7 Project Posting and Management (Client)

PostProjectPage:

- Loads skills list via GET /api/skills.
- Creates project via POST /api/projects.
- Supports title, description, budget, deadline, tech stack, required skills.

ManageProjectsPage:

- Resolves client id from GET /api/profile/client/:user_id.
- Loads client projects from GET /api/projects/client/:client_id.
- Allows status updates (open/in_progress/closed) via PUT /api/projects/:id.
- Allows project deletion via DELETE /api/projects/:id.
- Loads applicants by project via GET /api/applications/project/:project_id.
- Rejects applicant via DELETE /api/applications/:id.
- Opens hiring flow through CreateContractModal.
- Opens freelancer profile preview modal before hiring.

Backend guardrails:

- Only clients can create/update/delete their own projects.
- Required skill IDs are validated to exist.

## 7.8 Application Workflow

Freelancer application creation:

- Endpoint: POST /api/applications
- Conditions:
  - caller role must be freelancer
  - freelancer can apply only as own profile
  - project must exist and be open
  - duplicate apply blocked by unique constraint

Client applicant review:

- Endpoint: GET /api/applications/project/:project_id
- Only project owner client can access.
- Excludes freelancers already hired for the same project.

Freelancer self-view:

- Endpoint: GET /api/applications/freelancer/:freelancer_id
- Freelancers can view only their own applications.

Application removal:

- Endpoint: DELETE /api/applications/:id
- Freelancer can withdraw own application.
- Client can remove/reject applicants from own projects.

MyApplicationsPage:

- Fetches and lists freelancer applications with project context.

## 7.9 Contract Creation and Lifecycle

CreateContractModal + backend contract creation:

- Endpoint: POST /api/contracts
- Inputs include project_id, freelancer_id, client_id, agreed_amount, scope, task details, dates.
- Scope types:
  - full_project
  - task_based (requires task_description)

Backend checks:

- caller role must be client
- client must own the provided client profile
- project must belong to that client
- freelancer must exist
- freelancer must have applied to the project first
- duplicate contract blocked for same project/freelancer/client combo

On successful contract creation:

- Application record for hired freelancer/project is deleted.

Contract retrieval:

- GET /api/contracts/freelancer/:freelancer_id
- GET /api/contracts/client/:client_id
- GET /api/contracts/:id

Authorization:

- Only owning client or owning freelancer can access a contract.

Status updates:

- PUT /api/contracts/:id/status
- Only owning client can update.
- Allowed transitions are controlled (active -> completed/cancelled; no arbitrary reopening).

Frontend contract pages:

- ClientContractsPage and FreelancerContractsPage list contracts.
- ContractPage shows detailed contract info and actions.

## 7.10 Payment Tracking

PaymentSection on ContractPage:

- Loads payments via GET /api/payments/contract/:contract_id.
- Client can add payment via POST /api/payments.
- Client can mark pending payment completed via PUT /api/payments/:id.
- Freelancer sees payment timeline in read-only mode.

Payment rules:

- Only clients can create/update payments.
- Access checks ensure only contract owner (client or freelancer) can read contract payments.

## 7.11 Review and Feedback

ReviewForm on ContractPage:

- Fetches existing review via GET /api/reviews/contract/:contract_id.
- Submits review via POST /api/reviews.
- Allows rating 1-5 and optional comment.

Review rules:

- Only clients can create reviews.
- Review allowed only after contract status is completed.
- Reviewer user_id must match authenticated user.
- Only one review per contract per user.

Freelancer review visibility:

- GET /api/reviews/freelancer/:freelancer_id
- Used on FreelancerDashboard for reputation view.

## 7.12 Dashboards

ClientDashboard:

- Loads client profile.
- Aggregates project and contract data.
- Shows key totals and quick insight cards.

FreelancerDashboard:

- Loads freelancer profile.
- Aggregates applications, contracts, and reviews.
- Shows activity and performance snapshot.

## 7.13 Global UX Enhancements

- Global Loading Overlay:
  - Axios interceptors increment/decrement request counter.
  - LoadingSpinner appears for active network requests.
- Toast Notifications:
  - Success/error feedback on key actions (create/update/delete/submit flows).
- Inline Errors and Success Messages:
  - Most forms/pages expose actionable error messages from API.

## 8) Backend API Surface

Auth:

- POST /api/auth/register
- POST /api/auth/login

Profile:

- GET /api/profile/freelancer/:id
- PUT /api/profile/freelancer/:id
- GET /api/profile/client/:id
- PUT /api/profile/client/:id

Skills:

- GET /api/skills
- POST /api/skills
- POST /api/skills/assign
- DELETE /api/skills/remove

Projects:

- POST /api/projects
- GET /api/projects
- GET /api/projects/:id
- GET /api/projects/client/:client_id
- PUT /api/projects/:id
- DELETE /api/projects/:id

Applications:

- POST /api/applications
- GET /api/applications/project/:project_id
- GET /api/applications/freelancer/:freelancer_id
- DELETE /api/applications/:id

Contracts:

- POST /api/contracts
- GET /api/contracts/:id
- GET /api/contracts/freelancer/:freelancer_id
- GET /api/contracts/client/:client_id
- PUT /api/contracts/:id/status

Payments:

- POST /api/payments
- GET /api/payments/contract/:contract_id
- PUT /api/payments/:id

Reviews:

- POST /api/reviews
- GET /api/reviews/contract/:contract_id
- GET /api/reviews/freelancer/:freelancer_id

Stats:

- GET /api/stats/overview

Health:

- GET /health

## 9) How We Built It (Implementation Approach)

1. Defined domain models and relationships in Prisma schema first.
2. Created migrations and generated Prisma client.
3. Implemented Express route modules by business domain.
4. Added validation and error normalization middleware.
5. Added JWT auth and role/ownership authorization checks.
6. Built React routes and role-based route guards.
7. Built pages around domain flows:
   - auth
   - profiles
   - projects
   - applications
   - contracts
   - payments
   - reviews
8. Added shared UX components (navbar, loading overlay, toasts, modals).
9. Connected all pages to backend APIs via centralized Axios instance.
10. Iterated route behavior and redirects for cleaner UX (including authenticated home redirect behavior).

## 10) Local Setup and Run

Backend:

- cd server
- npm install
- create server/.env
- npx prisma generate
- npx prisma migrate dev
- npm run dev

Frontend:

- cd client
- npm install
- create client/.env
- npm run dev

Environment variables:

server/.env

- PORT=5000
- DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/skillhire?schema=public
- JWT_SECRET=replace_with_strong_secret
- JWT_EXPIRES_IN=7d
- FRONTEND_URL=http://localhost:5173

client/.env

- VITE_API_URL=http://localhost:5000

## 11) End-to-End Business Flow

A complete happy path is:

1. Register one client and one freelancer.
2. Client posts a project.
3. Freelancer browses and applies.
4. Client reviews applicants and hires via contract creation.
5. Client and freelancer track contract details.
6. Client adds payment record(s) and marks completed payments.
7. Client marks contract completed.
8. Client submits review for freelancer.
9. Freelancer sees updated reviews and contract/payment history.

## 12) Current Product Scope

Implemented and production-ready core modules:

- Authentication and role onboarding
- Profile and skill management
- Project lifecycle management
- Application pipeline
- Contract lifecycle
- Payment tracking
- Review system
- Dashboards and platform stats
- Role-based navigation and route protection

This is the current complete implementation of SkillHire in this repository.