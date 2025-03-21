const express = require("express");
const router = express.Router();
const multer = require("multer");

const {
  createEntry,
  getStudentEntries,
  getSubmittedEntries,
  gradeEntry,
  updateEntryStatus,
  getTeacherDashboard,
  getAssignmentsFromMoodle,
  upload, // ✅ Import upload from controller
} = require("../controllers/entryController");


const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

// ✅ Student creates a logbook entry (Now supports file upload)
// ✅ Use Cloudinary upload middleware
router.post("/", authMiddleware, roleMiddleware("student"), upload.single("media_file"), createEntry);


// ✅ Fetch all logbook entries for a specific student
router.get("/student/:moodle_id", authMiddleware, roleMiddleware("student"), getStudentEntries);

// ✅ Fetch Teacher Dashboard Data
router.get("/teacher/:moodle_id", authMiddleware, roleMiddleware("teacher"), getTeacherDashboard);

// ✅ Fetch submitted logbook entries for a course (For Teachers)
router.get("/submitted/:courseId", authMiddleware, roleMiddleware("teacher"), getSubmittedEntries);

// ✅ Grade an entry (Teacher action)
router.post("/grade", authMiddleware, roleMiddleware("teacher"), gradeEntry);

// ✅ Update the status of an entry (Student submits an entry)
router.post("/update-status", authMiddleware, roleMiddleware("student"), updateEntryStatus);

// ✅ Fetch assignments from Moodle dynamically
router.get("/assignments/:courseId", authMiddleware, getAssignmentsFromMoodle);

module.exports = router;
