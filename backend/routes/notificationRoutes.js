const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { getStudentNotifications, markNotificationAsRead } = require("../controllers/notificationController");

// ✅ Fetch all notifications for a student
router.get("/student", authMiddleware, getStudentNotifications);

// ✅ Mark a notification as read
router.post("/student/read/:id", authMiddleware, markNotificationAsRead);

module.exports = router;
