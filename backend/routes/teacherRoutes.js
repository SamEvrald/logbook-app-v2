const express = require("express");
const router = express.Router();
const {
  signupTeacher,
  loginTeacher,
  getSubmittedEntries,
 
  getTeacherCourses,
} = require("../controllers/teacherController");
const { allowResubmit } = require("../controllers/entryController"); // ✅ Make sure it's imported


const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

// ✅ Allow resubmission for an entry (Teacher action)
router.put("/entries/:id/allow-resubmit", authMiddleware, roleMiddleware("teacher"), allowResubmit);

// ✅ Teacher Signup
router.post("/signup", signupTeacher);

// ✅ Teacher Login
router.post("/login", loginTeacher);

// ✅ Fetch assigned courses
router.get("/:teacherEmail/courses", authMiddleware, roleMiddleware("teacher"), getTeacherCourses);

// ✅ Fetch submitted logbook entries for assigned courses
router.get("/:teacherEmail/entries", authMiddleware, roleMiddleware("teacher"), getSubmittedEntries);

// ✅ Grade an Entry
//router.post("/grade", authMiddleware, roleMiddleware("teacher"), gradeEntry);





module.exports = router;
