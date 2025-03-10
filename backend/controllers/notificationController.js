const db = require("../models/db");


// ✅ Fetch Notifications for Logged-in Student
exports.getStudentNotifications = async (req, res) => {
    try {
        const moodleId = req.user.moodle_id; // ✅ Get moodle_id from token

        // 🔍 Find `user_id` using `moodle_id`
        const [userRows] = await db.promise().query(
            "SELECT id FROM users WHERE moodle_id = ?",
            [moodleId]
        );

        if (userRows.length === 0) {
            console.error("❌ No user found with this Moodle ID:", moodleId);
            return res.status(404).json({ message: "User not found." });
        }

        const userId = userRows[0].id; // ✅ Get the correct `user_id`

        // ✅ Fetch notifications for `user_id`
        const [notifications] = await db.promise().query(
            "SELECT * FROM notifications WHERE user_id = ? ORDER BY timestamp DESC",
            [userId]
        );

        res.json(notifications);
    } catch (error) {
        console.error("❌ Error fetching notifications:", error);
        res.status(500).json({ message: "Server error while fetching notifications" });
    }
};


// ✅ Mark Notification as Read
exports.markNotificationAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const studentId = req.user.id; // Ensure only the logged-in student can mark as read

        const [result] = await db.promise().query(
            "UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?",
            [id, studentId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Notification not found or unauthorized" });
        }

        res.json({ message: "Notification marked as read" });
    } catch (error) {
        console.error("❌ Error marking notification as read:", error);
        res.status(500).json({ message: "Server error while updating notification" });
    }
};

// ✅ Notify Students in a Course when Assignment is Created
exports.createAssignmentNotification = async (course_id, assignment_name, moodle_instance_id) => {
    const [students] = await db.promise().query(
        "SELECT id FROM users WHERE moodle_instance_id = ? AND role = 'student'",
        [moodle_instance_id]
    );

    for (const student of students) {
        await db.promise().query(
            "INSERT INTO notifications (user_id, message) VALUES (?, ?)",
            [student.id, `📢 New assignment '${assignment_name}' has been added.`]
        );
    }
};

// ✅ Notify Student when Logbook Entry is Graded
exports.notifyEntryGraded = async (studentId, caseNumber, grade) => {
    try {
        await db.promise().query(
            "INSERT INTO notifications (student_id, message) VALUES (?, ?)",
            [studentId, `✅ Your logbook entry ${caseNumber} has been graded. Grade: ${grade}`]
        );

        console.log(`✅ Notified student ${studentId} about graded logbook entry: ${caseNumber}`);
    } catch (error) {
        console.error("❌ Error notifying student about graded entry:", error);
    }
};
