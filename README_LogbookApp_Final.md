# Logbook App v2

An advanced logbook system purpose-built for professional students in ISPO-accredited programs (Prosthetics & Orthotics) to track, submit, and sync their clinical activity logs with Moodle LMS — all within a responsive, secure, and intuitive web app.

---

## 🚨 Problem Statement

Professional health students working in clinics often struggle to document and submit their daily clinical activities efficiently. Existing tools are either paper-based or lack Moodle integration, leading to inconsistent tracking, delayed grading, and student-teacher communication gaps.

**This Logbook App solves this by enabling students to:**
- Log clinical activities daily from any device
- Upload up to 5 supporting media files (images/videos)
- Submit logs per course for teacher grading
- View grading status and feedback
- Sync final grades directly to Moodle

Meanwhile, **teachers** can:
- View and filter entries by status (submitted, in progress, not submitted)
- Grade, comment, and optionally allow re-submission
- Upload feedback media (visible only to the student)
- See all students per course linked with Moodle

Admins manage the entire system — Moodle instances, teachers, students — all in one dashboard.

---

## 🧠 Architecture Overview

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

## 🚀 Key Features

| Feature                          | Description                                                                 |
|----------------------------------|-----------------------------------------------------------------------------|
| 🔐 Role-based Auth              | Separate login and dashboards for students, teachers, and admins           |
| 🎓 Moodle Sync                  | Students select their Moodle course during login; grade push is automated |
| 📝 Entry Logging                | Students can create, save, and submit clinical entries                     |
| 📂 Media Upload                 | Up to 5 images/videos per entry using Cloudinary                          |
| 📬 Feedback Loop                | Teachers can upload private feedback media, and allow re-submissions      |
| 🧾 Grade Sync to Moodle         | Graded marks are automatically synced via Moodle’s API                    |
| 📊 Admin Panel                  | Admin can manage Moodle instances, teachers, students                     |

---

## ⚙️ Technology Justification

| Stack Element     | Reason                                                                 |
|------------------|------------------------------------------------------------------------|
| **Node.js**       | High-performance non-blocking API for real-time data interactions     |
| **MySQL**         | Strong relational integrity, ideal for user-course-log relationships  |
| **Cloudinary**    | Offloads media handling, reduces server load, supports transformations|
| **React**         | Component-driven, fast UI updates, responsive                         |
| **JWT + Middleware** | Secure route protection for role-based authorization                |

---

## 🔌 API Structure

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

## 🧪 Testing / Linting / CI

- Manual testing with Postman
- Frontend tested via local browser
- JWT and file upload middleware tested in isolation
- No automated tests (yet) — future roadmap includes unit tests (Jest) and CI setup via GitHub Actions

---

## 📸 Screenshots

Add screenshots or demo GIFs in `/demo` folder or README:

```
📁 demo/
├── login.gif
├── student-entry.png
├── teacher-grade.png
└── admin-dashboard.gif
```

---

## 🛠 Known Limitations

- No multi-language support

---

## 🧭 Future Improvements

- Add ESLint + Prettier config and GitHub CI
- Add unit tests and Cypress end-to-end tests
- Add bulk CSV import for student registration
- Add comments/feedback thread per entry
- Add dark mode, table filters, pagination

---

## 📦 Local Setup

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

## 📢 Demo Deployment (Optional)


---

## 👨‍💻 Author

**Sam Evrald Muyango**  
Full Stack Developer | Instructional Designer | Technical Problem-Solver  
[GitHub Profile](https://github.com/SamEvrald)

---


