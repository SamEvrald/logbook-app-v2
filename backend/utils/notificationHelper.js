const db = require("../models/db");

//  Create Notification
const createNotification = async (studentId, message) => {
    await db.promise().query(
        "INSERT INTO notifications (student_id, message, is_read) VALUES (?, ?, false)",
        [studentId, message]
    );
};

// Notify Students When a New Assignment is Added
const notifyNewAssignment = async (courseId, assignmentName) => {
    const [students] = await db.promise().query("SELECT id FROM users WHERE course_id = ? AND role = 'student'", [courseId]);

    for (const student of students) {
        await createNotification(student.id, ` New Assignment: '${assignmentName}' is available.`);
    }
};

//  Notify Student When Logbook Entry is Graded
const notifyGradedEntry = async (studentId) => {
    await createNotification(studentId, ` Your logbook entry has been graded. Check your feedback.`);
};

module.exports = { createNotification, notifyNewAssignment, notifyGradedEntry };
