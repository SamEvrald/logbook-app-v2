const express = require("express");
const router = express.Router();
const { getStudentCourses } = require("../controllers/studentController");
const authMiddleware = require("../middleware/authMiddleware");

// ✅ Fetch student courses (Ensure moodle_instance_id is passed)
router.get("/courses", authMiddleware, getStudentCourses);

module.exports = router;
