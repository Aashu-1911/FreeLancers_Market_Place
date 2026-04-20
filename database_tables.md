# Database Tables

| Table | Primary Key | Attributes |
| --- | --- | --- |
| User | user_id | first_name, last_name, username, email, profile_picture, phone, city, pincode, password, created_at |
| Freelancer | freelancer_id | user_id, college_name, degree, year_of_study, portfolio, resume, availability, status |
| Client | client_id | user_id, client_type |
| Skill | skill_id | skill_name, description |
| FreelancerSkill | id | freelancer_id, skill_id |
| Project | project_id | client_id, title, description, budget, work_mode, engagement_type, address, area, tech_stack, deadline, posted_date, project_status |
| ProjectSkill | id | project_id, skill_id |
| Application | application_id | project_id, freelancer_id, applied_date |
| Contract | contract_id | project_id, freelancer_id, client_id, agreed_amount, contract_scope, task_description, start_date, end_date, status |
| Review | review_id | contract_id, user_id, rating, comment |
| Payment | payment_id | contract_id, amount, payment_status, transaction_date |
