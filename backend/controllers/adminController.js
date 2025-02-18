const db = require("../models/db");
const axios = require("axios");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");


// ✅ Fetch Admin Profile
exports.getAdminProfile = async (req, res) => {
  res.status(200).json({ username: req.user.username, email: req.user.email });
};

// ✅ Remove a course from a teacher
exports.removeCourseFromTeacher = async (req, res) => {
  const { teacher_id, course_id } = req.body;

  if (!teacher_id || !course_id) {
      return res.status(400).json({ message: "Teacher ID and Course ID are required." });
  }

  try {
      await db.promise().query("DELETE FROM teacher_courses WHERE teacher_id = ? AND course_id = ?", [teacher_id, course_id]);
      res.json({ message: "Course removed from teacher successfully." });
  } catch (error) {
      console.error("Database error:", error);
      res.status(500).json({ message: "Failed to remove course.", error: error.message });
  }
};

// ✅ Fetch all courses from Moodle
exports.getAllCourses = async (req, res) => {
    try {
      const moodleUrl = `${process.env.MOODLE_BASE_URL}/webservice/rest/server.php`;
      const token = process.env.MOODLE_TOKEN;
  
      const params = {
        wstoken: token,
        wsfunction: "core_course_get_courses",
        moodlewsrestformat: "json",
      };
  
      const response = await axios.get(moodleUrl, { params });
  
      // ✅ Ensure response is valid
      if (!Array.isArray(response.data)) {
        console.error("Invalid Moodle response:", response.data);
        return res.status(500).json({ message: "Unexpected response from Moodle." });
      }
  
      res.json(response.data);
    } catch (error) {
      console.error("Failed to fetch courses:", error);
      res.status(500).json({ message: "Failed to fetch courses from Moodle", error: error.message });
    }
  };

// ✅ Assign a course to a teacher
exports.assignCourseToTeacher = async (req, res) => {
    const { teacher_id, course_id } = req.body;
  
    console.log("Received assignment request:", { teacher_id, course_id });
  
    if (!teacher_id || !course_id) {
      console.log("Missing teacher_id or course_id");
      return res.status(400).json({ message: "Teacher ID and Course ID are required." });
    }
  
    try {
      // ✅ Step 1: Fetch all courses from Moodle
      const moodleUrl = `${process.env.MOODLE_BASE_URL}/webservice/rest/server.php`;
      const token = process.env.MOODLE_TOKEN;
  
      const params = {
        wstoken: token,
        wsfunction: "core_course_get_courses",
        moodlewsrestformat: "json",
      };
  
      const response = await axios.get(moodleUrl, { params });
      const moodleCourses = response.data;
  
      // ✅ Step 2: Check if the course exists in Moodle
      const courseExists = moodleCourses.some(course => course.id == course_id);
  
      if (!courseExists) {
        console.log(`Course ID ${course_id} does not exist in Moodle.`);
        return res.status(400).json({ message: `Course ID ${course_id} does not exist in Moodle.` });
      }
  
      // ✅ Step 3: Assign the course to the teacher (even if not in `courses` table)
      await db.promise().query(
        `INSERT INTO teacher_courses (teacher_id, course_id) VALUES (?, ?) 
         ON DUPLICATE KEY UPDATE course_id = VALUES(course_id)`,
        [teacher_id, course_id]
      );
  
      console.log("Course assigned successfully!");
      res.json({ message: "Course assigned successfully" });
  
    } catch (error) {
      console.error("Database error:", error);
      res.status(500).json({ message: "Failed to assign course", error: error.message });
    }
  };
  
  

// ✅ Get all courses assigned to a specific teacher
exports.getTeacherCourses = async (req, res) => {
  const { teacher_id } = req.params;

  try {
    const [results] = await db.promise().query(
      `SELECT c.id as course_id, c.fullname, c.shortname 
       FROM teacher_courses tc
       JOIN courses c ON tc.course_id = c.id
       WHERE tc.teacher_id = ?`,
      [teacher_id]
    );
    res.json(results);
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ message: "Failed to fetch teacher courses", error: error.message });
  }
};

// ✅ Get all teachers and their assigned courses
exports.getTeachersWithCourses = async (req, res) => {
  try {
    const [results] = await db.promise().query(
      `SELECT t.id as teacher_id, t.username, t.email, c.id as course_id, c.fullname 
       FROM teachers t
       LEFT JOIN teacher_courses tc ON t.id = tc.teacher_id
       LEFT JOIN courses c ON tc.course_id = c.id`
    );
    res.json(results);
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ message: "Failed to fetch teachers with courses", error: error.message });
  }
};

// ✅ Admin Signup
exports.signupAdmin = async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: "All fields are required." });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.promise().query(
      "INSERT INTO admins (username, email, password) VALUES (?, ?, ?)",
      [username, email, hashedPassword]
    );

    res.status(201).json({ message: "Admin signup successful. Please log in." });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ message: "Failed to sign up admin", error: error.message });
  }
};

// ✅ Admin Login
exports.loginAdmin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await db.promise().query("SELECT * FROM admins WHERE email = ?", [email]);

    if (rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const isMatch = await bcrypt.compare(password, rows[0].password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const token = jwt.sign(
      { adminId: rows[0].id, email: rows[0].email, role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(200).json({
      message: "Login successful",
      user: { username: rows[0].username, email: rows[0].email, role: "admin" },
      token,
    });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ message: "Failed to login admin", error: error.message });
  }
};

// ✅ Get All Teachers (For Dropdown in Admin Panel)
exports.getAllTeachers = async (req, res) => {
    try {
      const [teachers] = await db.promise().query(
        `SELECT id, username, email FROM teachers`
      );
      res.json(teachers);
    } catch (error) {
      console.error("Database error:", error);
      res.status(500).json({ message: "Failed to fetch teachers", error: error.message });
    }
  };
  
  