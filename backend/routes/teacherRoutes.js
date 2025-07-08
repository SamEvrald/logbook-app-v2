const express = require("express");
const router = express.Router();
const teacherController = require("../controllers/teacherController");
const entryController = require("../controllers/entryController");   
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


// Allow resubmission for an entry (Teacher action, handled by entryController)

router.put("/entries/:id/allow-resubmit", authMiddleware, roleMiddleware("teacher"), entryController.allowResubmit);


module.exports = router;
