// notificationController.js

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
        // Ensure you are fetching the `is_read` column as well
        const [notifications] = await db.promise().query(
            "SELECT id, user_id, message, timestamp, is_read FROM notifications WHERE user_id = ? ORDER BY timestamp DESC", // ✅ Added is_read to select
            [userId]
        );

        res.json(notifications);
    } catch (error) {
        console.error("❌ Error fetching student notifications:", error);
        res.status(500).json({ message: "Server error while fetching student notifications" });
    }
};


// ✅ NEW: Fetch Notifications for Logged-in Teacher (using internal ID)
exports.getTeacherNotifications = async (req, res) => {
    try {
        const teacherInternalUserId = req.params.userId; // Get internal user ID from URL params

        // 🔍 Find the teacher's actual user_id in the users table by their internal ID and role
        const [userRows] = await db.promise().query(
            "SELECT id FROM users WHERE id = ? AND role = 'teacher'",
            [teacherInternalUserId]
        );

        if (userRows.length === 0) {
            console.error("❌ No teacher user found with this internal ID in users table:", teacherInternalUserId);
            return res.status(404).json({ message: "Teacher user not found or unauthorized for notifications." });
        }

        const userId = userRows[0].id; // This is the confirmed internal user_id for the teacher

        // ✅ Fetch notifications for this teacher's internal `user_id`
        const [notifications] = await db.promise().query(
            "SELECT id, user_id, message, timestamp, is_read FROM notifications WHERE user_id = ? ORDER BY timestamp DESC",
            [userId]
        );

        res.json(notifications);
    } catch (error) {
        console.error("❌ Error fetching teacher notifications:", error);
        res.status(500).json({ message: "Server error while fetching teacher notifications" });
    }
};


// ✅ Robust Mark Notification as Read for both Students and Teachers
exports.markNotificationAsRead = async (req, res) => {
    try {
        const { id } = req.params; // Notification ID
        let authenticatedUserId; // This will be the user_id from the 'users' table

        // Determine the authenticated user's internal ID based on role
        if (req.user.role === 'student') {
            // For students, find their internal 'id' from 'users' table using their 'moodle_id'
            // This is necessary because req.user.id might not always be the internal user_id directly
            const [userRows] = await db.promise().query(
                "SELECT id FROM users WHERE moodle_id = ?",
                [req.user.moodle_id]
            );
            if (userRows.length === 0) {
                console.error("❌ Student not found in users table with moodle_id:", req.user.moodle_id);
                return res.status(401).json({ message: "Unauthorized: Student user not found for notification update." });
            }
            authenticatedUserId = userRows[0].id;
        } else if (req.user.role === 'teacher') {
            // For teachers, their 'id' from the 'teachers' table is already synced to 'users.id'
            // and should be directly available in req.user.id or req.user.internal_user_id
            authenticatedUserId = req.user.internal_user_id || req.user.id;
            if (!authenticatedUserId) {
                console.error("❌ Teacher internal user ID not found in token for marking notification.", req.user);
                return res.status(401).json({ message: "Unauthorized: Teacher internal ID missing for notification update." });
            }
        } else {
            return res.status(401).json({ message: "Unauthorized: Unknown user role for notification update." });
        }

        console.log(`DEBUG: Attempting to mark notification ${id} as read for user ${authenticatedUserId} (Role: ${req.user.role})`);

        // Update the notification, ensuring it belongs to the authenticated user
        const [result] = await db.promise().query(
            "UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?",
            [id, authenticatedUserId]
        );

        if (result.affectedRows === 0) {
            // This means either the notification ID was wrong, or it didn't belong to the `authenticatedUserId`
            console.warn(`⚠️ Notification ${id} not found or not owned by user ${authenticatedUserId}.`);
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
    try {
        const [students] = await db.promise().query(
            "SELECT id FROM users WHERE moodle_instance_id = ? AND role = 'student'",
            [moodle_instance_id]
        );

        for (const student of students) {
            await db.promise().query(
                "INSERT INTO notifications (user_id, message, is_read) VALUES (?, ?, FALSE)",
                [student.id, `📢 New Logbook Entry '${assignment_name}' has been created.`]
            );
        }
    } catch (error) {
        console.error("❌ Error notifying students about assignment creation:", error);
    }
};

// ✅ Notify Student when Logbook Entry is Graded
exports.notifyEntryGraded = async (studentId, caseNumber, grade, feedback) => {
    try {
        const message = `✅ Your logbook entry #${caseNumber} has been graded. Grade: ${grade}.`;
        await db.promise().query(
            "INSERT INTO notifications (user_id, message, is_read) VALUES (?, ?, FALSE)",
            [studentId, message]
        );

        console.log(`✅ Notified student ${studentId} about graded logbook entry: ${caseNumber}`);
    } catch (error) {
        console.error("❌ Error notifying student about graded entry:", error);
    }
};

// ✅ NEW: Notify Student when a New Logbook Entry is Created
exports.notifyNewLogbookEntry = async (studentUserId, caseNumber) => {
    try {
         console.log(`Inside notifyNewLogbookEntry for student ${studentUserId}, case ${caseNumber}`);
       
        await db.promise().query(
            "INSERT INTO notifications (user_id, message, is_read) VALUES (?, ?, FALSE)",
            [studentUserId, `✍️ Your new logbook entry #${caseNumber} has been successfully created.`]
        );
        console.log(`✅ Notified student ${studentUserId} about new logbook entry: ${caseNumber}`);
    } catch (error) {
        console.error("❌ Error notifying student about new entry:", error);
    }
};

// ✅ NEW FUNCTION: Notify Teacher when a student submits an entry (uses internal user ID for teacher)
exports.notifyTeacherOnStudentSubmission = async (courseId, studentName, caseNumber) => {
    try {
        // Find all teachers associated with this course from the 'users' table (where they are now synced)
        const [teacherUsers] = await db.promise().query(
            `SELECT u.id
             FROM users u
             JOIN teacher_courses ct ON u.id = ct.teacher_id
             WHERE ct.course_id = ? AND u.role = 'teacher'`,
            [courseId]
        );

        if (teacherUsers.length === 0) {
            console.log(`ℹ️ No teachers found in 'users' table for course ID ${courseId}. No notification sent.`);
            return;
        }

        const message = `🔔 Student ${studentName} has submitted a new logbook entry #${caseNumber} for grading.`; 

        for (const teacher of teacherUsers) {
            await db.promise().query(
                "INSERT INTO notifications (user_id, message, is_read) VALUES (?, ?, FALSE)",
                [teacher.id, message] // Use the internal teacher.id from the 'users' table
            );
            console.log(`✅ Notified teacher ${teacher.id} about student submission: ${studentName}, entry #${caseNumber}`);
        }
    } catch (error) {
        console.error("❌ Error notifying teachers about student submission:", error);
    }
};
