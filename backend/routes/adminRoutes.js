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
} = require("../controllers/adminController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

// ✅ Admin Profile
router.get("/profile", authMiddleware, roleMiddleware("admin"), getAdminProfile);

// ✅ Fetch all Moodle courses
router.get("/courses", authMiddleware, roleMiddleware("admin"), getAllCourses);

// ✅ Fetch all teachers
router.get("/teachers", authMiddleware, roleMiddleware("admin"), getAllTeachers);

// ✅ Assign course to teacher
router.post("/assign-course", authMiddleware, roleMiddleware("admin"), assignCourseToTeacher);

// ✅ Remove course from teacher
router.post("/remove-course", authMiddleware, roleMiddleware("admin"), removeCourseFromTeacher);

// ✅ Admin Signup
router.post("/signup", signupAdmin);

// ✅ Admin Login
router.post("/login", loginAdmin);

module.exports = router;
