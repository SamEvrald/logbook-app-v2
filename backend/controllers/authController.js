const db = require("../models/db");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const bcrypt = require("bcrypt");
const validator = require("../utils/validators");

/**
 * Student Login via Moodle
 * Authenticates student with Moodle credentials
 */
exports.login = async (req, res) => {
  try {
    const { username, password, moodle_instance_id } = req.body;

    // Validate required fields
    validator.validateRequiredFields(
      { username, password, moodle_instance_id },
      ['username', 'password', 'moodle_instance_id']
    );

    console.log(`🔍 Attempting Moodle login for: ${username}`);
    console.log(`🌍 Selected Moodle Instance ID: ${moodle_instance_id}`);

    const moodleInstId = validator.validateMoodleInstanceId(moodle_instance_id);

    // Fetch the correct Moodle instance from the database
    const [instanceRows] = await db.promise().query(
      "SELECT base_url, api_token FROM moodle_instances WHERE id = ?",
      [moodleInstId]
    );

    if (instanceRows.length === 0) {
      console.error("❌ Moodle instance not found in database.");
      return res.status(404).json({ message: "Moodle instance not found." });
    }

    const moodleInstance = instanceRows[0];

    // ✅ FIX: Removed console logging of API token
    console.log(`✅ Moodle instance found (API details not logged)`);

    // Authenticate with Moodle
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

    console.log(`✅ Moodle User ID: ${userInfo.userid}`);

    // Save/Update User in Database
    const user = {
      username: validator.sanitizeString(userInfo.username, 'username', 100),
      fullname: validator.sanitizeString(userInfo.fullname, 'fullname', 255),
      moodle_id: userInfo.userid,
      role: "student",
    };

    await db.promise().query(
      `INSERT INTO users (username, role, moodle_id, moodle_instance_id) 
       VALUES (?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE username = VALUES(username), moodle_instance_id = VALUES(moodle_instance_id)`,
      [user.username, user.role, user.moodle_id, moodleInstId]
    );

    // Generate JWT Token
    const tokenPayload = { 
      moodle_id: user.moodle_id, 
      username: user.username, 
      role: "student", 
      moodle_instance_id: moodleInstId
    };

    console.log("✅ JWT Token generated for student login");

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: "1d" });

    res.status(200).json({
      message: "Login successful",
      user: { 
        username: user.username,
        fullname: user.fullname,
        moodle_id: user.moodle_id,
        role: "student",
        moodle_instance_id: moodleInstId, 
      },
      token,
    });

  } catch (err) {
    console.error("❌ Error during login:", err.message);
    res.status(500).json({ message: "Failed to authenticate with Moodle", error: err.message });
  }
};

/**
 * Teacher Login via Manual Credentials
 * ✅ FIXED: Now uses bcrypt for password hashing and comparison
 */
exports.teacherLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    validator.validateRequiredFields({ email, password }, ['email', 'password']);

    const validatedEmail = validator.validateEmail(email);

    const [teacherRows] = await db.promise().query(
      "SELECT id, username, email, password FROM teachers WHERE email = ?",
      [validatedEmail]
    );

    if (teacherRows.length === 0) {
      console.warn(`⚠️ Login attempt for non-existent teacher: ${validatedEmail}`);
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const teacher = teacherRows[0];

    // ✅ FIX: Use bcrypt.compare for secure password verification
    const isMatch = await bcrypt.compare(password, teacher.password);
    
    if (!isMatch) {
      console.warn(`⚠️ Failed login attempt for teacher: ${validatedEmail}`);
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const teacherId = teacher.id;
    const teacherUsername = teacher.username;

    console.log(`✅ Teacher '${teacherUsername}' logged in successfully`);

    // Automatic Upsert into 'users' table
    const [existingUserRows] = await db.promise().query(
      "SELECT id FROM users WHERE id = ? AND role = 'teacher'", 
      [teacherId] 
    );

    if (existingUserRows.length === 0) {
      try {
        await db.promise().query(
          `INSERT INTO users (id, username, role, created_at)
           VALUES (?, ?, ?, NOW())`,
          [teacherId, teacherUsername, 'teacher']
        );
        console.log(`✅ Created user entry for teacher '${teacherUsername}' (ID: ${teacherId})`);
      } catch (insertError) {
        console.error(`⚠️ Error inserting teacher into users table:`, insertError.message);
      }
    }

    // Generate JWT Token
    const token = jwt.sign(
      { teacherId: teacherId, id: teacherId, username: teacherUsername, email: teacher.email, role: "teacher" },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(200).json({
      message: "Login successful",
      user: { username: teacherUsername, email: teacher.email, role: "teacher" },
      token,
    });

  } catch (error) {
    console.error("❌ Teacher login error:", error.message);
    res.status(500).json({ message: "Server error during login", error: error.message });
  }
};
