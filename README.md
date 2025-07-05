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

- Home Page
![Home pag](https://github.com/user-attachments/assets/f3673415-7ea1-44d5-ab64-bda81e66f436)

- Student Login
![Student Login](https://github.com/user-attachments/assets/a8be8a17-d2d6-41f1-af38-08ff4b635cc8)

- Student Dashboard
![Student Dashboard](https://github.com/user-attachments/assets/724ba622-3257-4f4a-b07c-54ad515a47f1)

- Student Create Entry
- ![Create Entry1](https://github.com/user-attachments/assets/10ceaf5c-b1f9-462e-a32d-5e9b87906ef4)
- ![Create Entry2](https://github.com/user-attachments/assets/39c4d707-985f-4953-bdee-e76305d88208)

- Teacher Login
![Teacher Login](https://github.com/user-attachments/assets/7b4ce49b-0b12-4d0d-ae54-b756733a8cb6)

- Teacher Dashboard
![Teacher Dashbord](https://github.com/user-attachments/assets/606e6e82-990e-432f-9e48-0ada14072627)

- Teacher Grade Entry
![Teacher Grading Form](https://github.com/user-attachments/assets/bfa2aa37-aed4-429c-aea2-7fe9fd9cd559)

- Admin Login
![Admin Login](https://github.com/user-attachments/assets/ef19d1df-fb6e-4331-aeb2-efae5527a7b4)

- Admin Dashboard
![Admin Dashboard Entries](https://github.com/user-attachments/assets/1b619a17-7b54-4c04-947f-83a87b65b12a)

- Admin Create Teacher
![Admin create teacher](https://github.com/user-attachments/assets/d756b45d-2895-411f-b450-b3004a2812ae)

- Admin Assign Course
![Admin Assign Course](https://github.com/user-attachments/assets/08ab5a4b-1660-4b00-a76a-dcf75173afa3)

- Admin Create Admin
![Admin create admin](https://github.com/user-attachments/assets/6e615c0c-2a67-498e-9dad-7dba61b1a79f)

- Admin Analytics
![Admin analytics](https://github.com/user-attachments/assets/7fa0265e-a417-472f-828b-0bb0b94ac8e1)
![Admin analytics 2](https://github.com/user-attachments/assets/579e2a4b-8fb8-4073-ac1a-ae0b02822a79)

---

## Demo Tour 


---

## Known Limitations

- No multi-language support (Human Study works accross the Globe)

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


