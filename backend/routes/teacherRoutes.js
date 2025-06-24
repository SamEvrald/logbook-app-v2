const express = require("express");
const router = express.Router();
const teacherController = require("../controllers/teacherController"); // Keep importing as whole object
const entryController = require("../controllers/entryController");   // ✅ Import entryController as a whole object
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");


// Teacher Signup
router.post("/signup", teacherController.signupTeacher);

// Teacher Login
router.post("/login", teacherController.loginTeacher);

// Fetch assigned courses
router.get("/:teacherEmail/courses", authMiddleware, roleMiddleware("teacher"), teacherController.getTeacherCourses);

// Fetch submitted logbook entries for assigned courses
router.get("/:teacherEmail/entries", authMiddleware, roleMiddleware("teacher"), teacherController.getSubmittedEntries);

// Grade an Entry
// router.post("/grade", authMiddleware, roleMiddleware("teacher"), teacherController.gradeEntry); // Still commented out as per your previous code

// ✅ Allow resubmission for an entry (Teacher action, handled by entryController)
// This is the CORRECTED and SINGLE definition for this route.
router.put("/entries/:id/allow-resubmit", authMiddleware, roleMiddleware("teacher"), entryController.allowResubmit);


module.exports = router;
