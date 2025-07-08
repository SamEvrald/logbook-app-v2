const db = require("../models/db");
const axios = require("axios");

// Function to Fetch Moodle Assignments and Notify Students
async function checkNewAssignments() {
    try {
        console.log("🔍 Checking for new assignments...");

        //  Get all Moodle instances
        const [moodleInstances] = await db.promise().query("SELECT * FROM moodle_instances");

        for (const moodle of moodleInstances) {
            console.log(`🔹 Checking Moodle instance: ${moodle.name}`);

            //  Fetch assignments from Moodle
            const response = await axios.get(`${moodle.base_url}/webservice/rest/server.php`, {
                params: {
                    wstoken: moodle.api_token,
                    wsfunction: "mod_assign_get_assignments",
                    moodlewsrestformat: "json",
                }
            });

            if (!response.data.courses || response.data.courses.length === 0) {
                console.log(` No assignments found for Moodle instance: ${moodle.name}`);
                continue;
            }

            for (const course of response.data.courses) {
                for (const assignment of course.assignments) {
                    //  Check if assignment already exists in the database
                    const [existingAssignments] = await db.promise().query(
                        "SELECT id FROM assignments WHERE moodle_assignment_id = ?",
                        [assignment.id]
                    );

                    if (existingAssignments.length === 0) {
                        //  New assignment detected - Insert it into the database
                        await db.promise().query(
                            "INSERT INTO assignments (course_id, assignment_name, moodle_assignment_id) VALUES (?, ?, ?)",
                            [course.id, assignment.name, assignment.id]
                        );

                        console.log(` New assignment added: ${assignment.name}`);

                        //  Notify students enrolled in this course
                        const [students] = await db.promise().query(
                            "SELECT id FROM users WHERE moodle_instance_id = ? AND role = 'student'",
                            [moodle.id]
                        );

                        for (const student of students) {
                            await db.promise().query(
                                "INSERT INTO notifications (user_id, message, is_read) VALUES (?, ?, false)",
                                [student.id, ` New assignment '${assignment.name}' has been added to ${course.fullname}.`]
                            );
                        }

                        console.log(` Notifications sent to enrolled students.`);
                    }
                }
            }
        }
    } catch (error) {
        console.error("❌ Error checking for new assignments:", error.message);
    }
}


setInterval(checkNewAssignments, 5 * 60 * 1000);

module.exports = { checkNewAssignments };
