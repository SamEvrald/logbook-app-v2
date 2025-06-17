const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { 
  getStudentNotifications, 
  markNotificationAsRead,
  getTeacherNotifications // ✅ Import getTeacherNotifications
} = require("../controllers/notificationController");

// ✅ Fetch all notifications for a student (using token's moodle_id)
router.get("/student", authMiddleware, getStudentNotifications);

// ✅ NEW: Fetch all notifications for a teacher (using internal user ID from URL params)
router.get("/teacher/internal/:userId", authMiddleware, getTeacherNotifications);

// ✅ Mark a notification as read (generic, relies on user ID from token)
router.put("/:id/read", authMiddleware, markNotificationAsRead);

module.exports = router;
