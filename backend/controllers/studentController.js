const axios = require("axios");
const db = require("../models/db");

// ✅ Fetch courses for logged-in student
exports.getStudentCourses = async (req, res) => {
  try {
    const { moodle_id, moodle_instance_id } = req.user; // ✅ Ensure moodle_instance_id comes from token

    console.log(`🔍 Fetching courses for Student ID: ${moodle_id}`);
    console.log(`🌍 Moodle Instance ID from Token: ${moodle_instance_id}`);

    if (!moodle_instance_id) {
      console.error("❌ moodle_instance_id is missing in JWT token.");
      return res.status(400).json({ message: "Invalid session. Moodle instance ID is missing." });
    }

    // ✅ Fetch the correct Moodle instance from the database
    const [instanceRows] = await db.promise().query(
      "SELECT * FROM moodle_instances WHERE id = ?", 
      [moodle_instance_id]
    );

    if (instanceRows.length === 0) {
      console.error("❌ Moodle instance not found in database.");
      return res.status(404).json({ message: "Moodle instance not found." });
    }

    const moodleInstance = instanceRows[0];

    console.log(`✅ Using Moodle Instance:`, moodleInstance);
    console.log(`🌍 Moodle Base URL: ${moodleInstance.base_url}`);
    console.log(`🔑 Moodle API Token: ${moodleInstance.api_token}`);

    // ✅ Double-check before making the request
    if (!moodleInstance.base_url || !moodleInstance.api_token) {
      console.error("❌ Moodle instance data is incomplete.");
      return res.status(500).json({ message: "Invalid Moodle instance configuration." });
    }

    // ✅ Fetch courses from the correct Moodle instance
    const moodleResponse = await axios.get(`${moodleInstance.base_url}/webservice/rest/server.php`, {
      params: {
        wstoken: moodleInstance.api_token,
        wsfunction: "core_enrol_get_users_courses",
        userid: moodle_id,
        moodlewsrestformat: "json",
      },
    });

    console.log(`📚 Moodle Response:`, moodleResponse.data);

    res.json(moodleResponse.data);
  } catch (error) {
    console.error("❌ Error fetching courses:", error.message);
    res.status(500).json({ message: "Failed to fetch courses", error: error.message });
  }
};
  