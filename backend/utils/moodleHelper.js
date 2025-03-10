const db = require("../models/db");
const axios = require("axios");

// ✅ Get Moodle API details dynamically
async function getMoodleAPIForStudent(studentId) {
    const [rows] = await db.promise().query(
        `SELECT moodle_instances.base_url, moodle_instances.api_token 
         FROM users 
         JOIN moodle_instances ON users.moodle_instance_id = moodle_instances.id 
         WHERE users.id = ?`, 
        [studentId]
    );

    if (rows.length === 0) {
        throw new Error("Moodle API details not found for this student");
    }

    return {
        baseUrl: rows[0].base_url,
        apiToken: rows[0].api_token,
    };
}

// ✅ Fetch assignments from the correct Moodle platform
async function fetchStudentAssignments(studentId) {
    try {
        const moodleDetails = await getMoodleAPIForStudent(studentId);
        
        const response = await axios.get(`${moodleDetails.baseUrl}/webservice/rest/server.php`, {
            params: {
                wstoken: moodleDetails.apiToken,
                wsfunction: "mod_assign_get_assignments",
                moodlewsrestformat: "json",
            }
        });

        return response.data;
    } catch (error) {
        console.error("❌ Error fetching assignments from Moodle:", error.message);
        throw new Error("Failed to fetch assignments from Moodle");
    }
}

module.exports = { getMoodleAPIForStudent, fetchStudentAssignments };
