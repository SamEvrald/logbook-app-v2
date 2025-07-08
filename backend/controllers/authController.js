const db = require("../models/db");
const jwt = require("jsonwebtoken");
const axios = require("axios");

exports.login = async (req, res) => {
  const { username, password, moodle_instance_id } = req.body;

  try {
    console.log(`🔍 Attempting Moodle login for: ${username}`);
    console.log(`🌍 Selected Moodle Instance ID: ${moodle_instance_id}`);

    if (!moodle_instance_id) {
      console.error("❌ Moodle instance ID not provided.");
      return res.status(400).json({ message: "Moodle instance ID is required." });
    }

    //  Fetch the correct Moodle instance from the database
    const [instanceRows] = await db.promise().query("SELECT * FROM moodle_instances WHERE id = ?", [moodle_instance_id]);

    if (instanceRows.length === 0) {
      console.error("❌ Moodle instance not found in database.");
      return res.status(404).json({ message: "Moodle instance not found." });
    }

    const moodleInstance = instanceRows[0];

    console.log(`Moodle Base URL: ${moodleInstance.base_url}`);
    console.log(`Moodle API Token: ${moodleInstance.api_token}`);

    //  Authenticate with Moodle
    const tokenResponse = await axios.get(`${moodleInstance.base_url}/login/token.php`, {
      params: { username, password, service: "moodle_mobile_app" },
    });

    if (!tokenResponse.data.token) {
      console.error("❌ Invalid Moodle credentials.");
      return res.status(401).json({ message: "Invalid Moodle credentials" });
    }

    const moodleToken = tokenResponse.data.token;

    // Fetch User Info from Moodle
    const userInfoResponse = await axios.get(`${moodleInstance.base_url}/webservice/rest/server.php`, {
      params: {
        wstoken: moodleToken,
        wsfunction: "core_webservice_get_site_info",
        moodlewsrestformat: "json",
      },
    });

    const userInfo = userInfoResponse.data;

    if (!userInfo.userid) {
      return res.status(400).json({ message: "Student ID (Moodle ID) is missing." });
    }

    console.log(` Moodle User ID: ${userInfo.userid}`);

    //  Save/Update User in Database (ensure moodle_instance_id is saved here too)
  
    const user = {
      username: userInfo.username,
      fullname: userInfo.fullname,
      moodle_id: userInfo.userid,
      role: "student",
      // We don't necessarily need to store moodle_instance_id in this `user` object
      // used for the DB query if it's already a separate parameter in the query.
      // However, ensure the DB columns exist for it.
    };

    await db.promise().query(
      `INSERT INTO users (username, role, moodle_id, moodle_instance_id) 
       VALUES (?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE username = VALUES(username), moodle_instance_id = VALUES(moodle_instance_id)`,
      [user.username, user.role, user.moodle_id, moodle_instance_id]
    );

    //  Generate JWT Token (Your original payload was correct)
    const tokenPayload = { 
      moodle_id: user.moodle_id, 
      username: user.username, 
      role: "student", 
      moodle_instance_id // Already correctly in JWT payload
    };

    console.log("🛠️ JWT Token Payload:", tokenPayload);

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: "1d" });

   
    res.status(200).json({
      message: "Login successful",
      user: { // This 'user' object is what gets stored in localStorage on the frontend
        username: user.username,
        fullname: user.fullname,
        moodle_id: user.moodle_id,
        role: "student",
        moodle_instance_id: moodle_instance_id, 
      },
      token,
    });

  } catch (err) {
    console.error("❌ Error during login:", err.message);
    res.status(500).json({ message: "Failed to authenticate with Moodle", error: err.message });
  }
};


// Teacher Login via Manual Credentials 
exports.teacherLogin = async (req, res) => {
  const { username, password } = req.body;

   db.query('SELECT * FROM users WHERE username = ? AND role = "teacher"', [username], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ message: "Failed to fetch user", error: err });
    }

    if (results.length === 0) {
      return res.status(401).json({ message: "Invalid credentials or user not found" });
    }

    const user = results[0];

    // Validate password
    if (user.password !== password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    //  Generate JWT Token
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: "teacher" },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(200).json({
      message: "Login successful",
      user: { username: user.username, role: "teacher" }, // Teachers might also need moodle_id/instance_id if their dashboard uses it
      token,
    });
  });
};
