# Logbook App

An advanced logbook system purpose-built for professional students in ISPO-accredited programs (Prosthetics & Orthotics) to track, submit, and sync their clinical activity logs with Moodle LMS — all within a responsive, secure, and intuitive web app.

---

## Problem Statement

Professional health students working in clinics often struggle to document and submit their daily clinical activities efficiently. Existing tools are either paper-based or lack Moodle integration, leading to inconsistent tracking, delayed grading, and student-teacher communication gaps.

**This Logbook App solves this by enabling students to:**
- Log clinical activities daily from any device
- Upload up to 5 supporting media files (images/videos)
- Submit entries per course for teacher grading
- View grading status and feedback
- Sync final grades directly to Moodle
- Login using their Moodle credentials

Meanwhile, **teachers** can:
- View and filter entries by status (submitted, in progress, not submitted)
- Grade, comment, and optionally allow re-submission
- Upload feedback media (visible only to the student for better feedback to students for their work)
- See all students per course linked with Moodle

Admins manage the entire system — Moodle instances, teachers, students — all in one dashboard.
- They can view all entries and their details
- Assign courses to teachers
- For easy maintenance they are the only ones to create Teacher accounts and other Admin if needed
- View in graphical representations different activities accross the platform.

---

## Architecture Overview

- **Backend**: Node.js + Express REST API
- **Frontend**: React (with React Router DOM, Axios)
- **Database**: MySQL
- **Cloud Media Storage**: Cloudinary via `multer-storage-cloudinary`
- **Authentication**: JWT (with role-based access control)
- **Moodle Integration**: External API sync for course/student/grade management
- **Deployment**: Linux + NGINX + PM2 + MySQL (no Vercel/Render)

```
┌────────────┐
│ React UI   │
└────┬───────┘
     │ API calls (Axios)
┌────▼───────┐
│ Node.js    │
│ Express    │
│ Controllers│
└────┬───────┘
     │
┌────▼─────────────┐
│ MySQL DB         │◄── Relational data model
└────┬─────────────┘
     │
┌────▼───────────────┐
│ Cloudinary         │◄── Media file hosting (images/videos)
└────────────────────┘
```

---

## Key Features

| Feature                          | Description                                                                 |
|----------------------------------|-----------------------------------------------------------------------------|
| Role-based Auth              | Separate login and dashboards for students, teachers, and admins           |
| Moodle Sync                  | Students select their Moodle program course during login; grade push, course and entries pull is automated |
| Entry Logging                | Students can create, save, and submit clinical entries                     |
| Media Upload                 | Up to 5 images/videos per entry using Cloudinary                          |
| Feedback Loop                | Teachers can upload private feedback media, and allow re-submissions      |
| Grade Sync to Moodle         | Graded marks are automatically synced via Moodle’s API                    |
| Admin Panel                  | Admin can manage Moodle instances, teachers, students                     |
| Export Report                | Admin and Teachers can export csv report detailed for their role          |

---

## Technology Justification

| Stack Element     | Reason                                                                 |
|------------------|------------------------------------------------------------------------|
| **Node.js**       | High-performance non-blocking API for real-time data interactions     |
| **MySQL**         | Strong relational integrity, ideal for user-course-log relationships  |
| **Cloudinary**    | Offloads media handling, cost-effective, reduces server load, supports transformations|
| **React**         | Component-driven, fast UI updates, responsive                         |
| **JWT + Middleware** | Secure route protection for role-based authorization                |

---

## API Structure

Organized by role and function:

### Auth Routes
- `POST /auth/login` (students)
- `POST /teachers/login` / `/signup`
- `POST /admin/login` / `/signup`

### Student Routes
- `GET /students/me`
- `POST /students/entry`
- `PUT /students/entry/:id` (update or resubmit)
- `GET /students/entries` (by course/status)

### Teacher Routes
- `GET /teachers/students`
- `POST /teachers/grade/:entryId`
- `GET /teachers/entries/:courseId`

### Admin Routes
- `GET /admin/teachers` / `POST /admin/create-teacher`
- `GET /admin/students` / `POST /admin/create-student`
- `GET /admin/moodle-instances`

### Moodle Routes
- `GET /moodle/instances`
- `POST /moodle/gradesync`

👉 **Full API Collection**: [Postman Collection](./LogbookApp_Postman_Collection.json)

---

## Testing / Linting / CI

- Manual testing with Postman
- Frontend tested via local browser and Human Study e.V testing servers
- JWT and file upload middleware tested in isolation
- No automated tests (yet) — future roadmap includes unit tests (Jest) and CI setup via GitHub Actions

---

## View 

![Home pag](https://github.com/user-attachments/assets/f3673415-7ea1-44d5-ab64-bda81e66f436)
![Student Login](https://github.com/user-attachments/assets/a8be8a17-d2d6-41f1-af38-08ff4b635cc8)
![Teacher Dashbord](https://github.com/user-attachments/assets/606e6e82-990e-432f-9e48-0ada14072627)
![Student Dashboard](https://github.com/user-attachments/assets/724ba622-3257-4f4a-b07c-54ad515a47f1)
![Create Entry2](https://github.com/user-attachments/assets/39c4d707-985f-4953-bdee-e76305d88208)
![Create Entry1](https://github.com/user-attachments/assets/10ceaf5c-b1f9-462e-a32d-5e9b87906ef4)
![Admin Login](https://github.com/user-attachments/assets/ef19d1df-fb6e-4331-aeb2-efae5527a7b4)


---

## Demo Tour 


---

## Known Limitations![Teacher Grading Form](https://github.com/user-attachments/assets/a2046289-e514-4727-8699-5f2686cd4e38)


- No multi-language support (Human Study works accross the Globe)
![Admin Dashboard Entries](https://github.com/user-attachments/assets/ae7cc911-7a90-4595-84e8-9a1a8974583f)
![Admin create teacher](https://github.com/user-attachments/assets/7dc3a604-303a-4f02-a3ec-a5555bb902c8)
![Admin create admin](https://github.com/user-attachments/assets/56136fdb-d1d4-47f1-b7b1-1b9ded48952b)
![Admin Assign Course](https://github.com/user-attachments/assets/3d1fccbc-1457-4ee8-9cf6-05a542d5dc57)
![Admin analytics](https://github.com/user-attachments/assets/7e3370dc-3c22-40ff-aaad-901f51e6687d)
![Admin analytics 2](https://github.com/user-attachments/assets/a8110c24-de3f-4b6a-84d9-300cd3960dc1)
![Teacher Login](https://github.com/user-attachments/assets/550282e0-a3a8-41f1-bb77-df4bce1b4299)

---

## Future Improvements

- Add ESLint + Prettier config and GitHub CI
- Add unit tests and Cypress end-to-end tests
- Develop a mobile version
- Add multi-language support

---

## Local Setup

```bash
git clone https://github.com/SamEvrald/logbook-app-v2.git
cd logbook-app-v2
# Set up backend
cd backend
npm install
cp .env.example .env  # configure DB, JWT, Cloudinary
npm run dev

# In another terminal
cd ../frontend
npm install
npm start
```

---


## Author

**Sam Evrald Muyango**  
Software Engineer | Instructional Designer | Technical Problem-Solver  
[GitHub Profile](https://github.com/SamEvrald)

---


