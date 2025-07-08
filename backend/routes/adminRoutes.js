const express = require("express");
const router = express.Router();
const {
    getAllCourses,
    assignCourseToTeacher,
    removeCourseFromTeacher,
    getAllTeachers, 
    signupAdmin,
    loginAdmin,
    getAdminProfile,
    getAllEntries, 
   
    getTotalStudents,
    getEntriesPerCourse,
    getEntriesByMonth,
    getEntryStatusSummary,
} = require("../controllers/adminController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

//  Admin Profile
router.get("/profile", authMiddleware, roleMiddleware("admin"), getAdminProfile);

//  Fetch all Moodle courses
router.get("/courses", authMiddleware, roleMiddleware("admin"), getAllCourses);

//  Fetch all teachers
router.get("/teachers", authMiddleware, roleMiddleware("admin"), getAllTeachers);

//  Fetch all logbook entries 
router.get("/entries", authMiddleware, roleMiddleware("admin"), getAllEntries);

//  Assign course to teacher
router.post("/assign-course", authMiddleware, roleMiddleware("admin"), assignCourseToTeacher);

//  Remove course from teacher
router.post("/remove-course", authMiddleware, roleMiddleware("admin"), removeCourseFromTeacher);

//  Admin Signup
router.post("/signup", signupAdmin);

//  Admin Login
router.post("/login", loginAdmin);

//  ANALYTICS ROUTES:
router.get("/analytics/total-students", authMiddleware, roleMiddleware("admin"), getTotalStudents);
router.get("/analytics/entries-per-course", authMiddleware, roleMiddleware("admin"), getEntriesPerCourse);
router.get("/analytics/entries-by-month", authMiddleware, roleMiddleware("admin"), getEntriesByMonth);
router.get("/analytics/entry-status-summary", authMiddleware, roleMiddleware("admin"), getEntryStatusSummary);


module.exports = router;
