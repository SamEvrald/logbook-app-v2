const db = require("../models/db");
const jwt = require("jsonwebtoken");
const axios = require("axios");

exports.login = async (req, res) => {
  const { username, password } = req.body;

  try {
    console.log(`🔍 Attempting Moodle login for: ${username}`);

    // ✅ Step 1: Authenticate with Moodle
    const tokenResponse = await axios.get(`${process.env.MOODLE_BASE_URL}/login/token.php`, {
      params: { username, password, service: process.env.MOODLE_SERVICE },
    });

    if (!tokenResponse.data.token) {
      console.error("❌ Invalid Moodle credentials.");
      return res.status(401).json({ message: "Invalid Moodle credentials" });
    }

    const moodleToken = tokenResponse.data.token;

    // ✅ Step 2: Fetch User Info from Moodle
    const userInfoResponse = await axios.get(`${process.env.MOODLE_BASE_URL}/webservice/rest/server.php`, {
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

    console.log(`✅ Moodle User ID: ${userInfo.userid}`);

    // ✅ Step 3: Fetch User Courses
    const coursesResponse = await axios.get(`${process.env.MOODLE_BASE_URL}/webservice/rest/server.php`, {
      params: {
        wstoken: moodleToken,
        wsfunction: "core_enrol_get_users_courses",
        userid: userInfo.userid,
        moodlewsrestformat: "json",
      },
    });

    const courses = coursesResponse.data;

    console.log(`📚 Fetched ${courses.length} enrolled courses.`);

    // ✅ Step 4: Save/Update User in Database
    const user = {
      username: userInfo.username,
      fullname: userInfo.fullname,
      moodle_id: userInfo.userid,
      role: "student",
    };

    await db.promise().query(
      `INSERT INTO users (username, role, moodle_id) 
       VALUES (?, ?, ?) 
       ON DUPLICATE KEY UPDATE username = VALUES(username)`,
      [user.username, user.role, user.moodle_id]
    );
    
    // ✅ Step 5: Generate JWT Token
    const token = jwt.sign(
      { moodle_id: user.moodle_id, username: user.username, role: "student" },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // ✅ Send Response
    res.status(200).json({
      message: "Login successful",
      user: { username: user.username, fullname: user.fullname, moodle_id: user.moodle_id, role: "student" },
      token,
      courses,
    });

  } catch (err) {
    console.error("❌ Error during login:", err.message);
    res.status(500).json({ message: "Failed to authenticate with Moodle", error: err.message });
  }
};

// ✅ Teacher Login via Manual Credentials
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

    // ✅ Validate password (You should hash and compare passwords if stored securely)
    if (user.password !== password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // ✅ Generate JWT Token
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: "teacher" },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(200).json({
      message: "Login successful",
      user: { username: user.username, role: "teacher" },
      token,
    });
  });
};
