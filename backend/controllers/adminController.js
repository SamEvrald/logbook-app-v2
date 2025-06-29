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
    const { moodle_instance_id } = req.query; // ✅ Get moodle_instance_id from request

    let query = `
      SELECT c.id, c.fullname, c.shortname, c.moodle_instance_id, m.name AS moodle_instance_name
      FROM courses c
      JOIN moodle_instances m ON c.moodle_instance_id = m.id
    `;

    let params = [];

    if (moodle_instance_id) {
      query += ` WHERE c.moodle_instance_id = ?`;
      params.push(moodle_instance_id);
    }

    query += ` ORDER BY c.moodle_instance_id`;

    const [courses] = await db.promise().query(query, params);

    res.json(courses);
  } catch (error) {
    console.error("❌ Failed to fetch courses:", error);
    res.status(500).json({ message: "Failed to fetch courses", error: error.message });
  }
};



// ✅ Assign a course to a teacher
exports.assignCourseToTeacher = async (req, res) => {
  const { teacher_id, course_id, moodle_instance_id } = req.body;

  console.log("🔍 Assigning Course:", { teacher_id, course_id, moodle_instance_id });

  if (!teacher_id || !course_id || !moodle_instance_id) {
    console.log("❌ Missing required fields");
    return res.status(400).json({ message: "Teacher ID, Course ID, and Moodle Instance ID are required." });
  }

  try {
    // ✅ Check if the teacher exists
    const [teacherRows] = await db.promise().query(
      "SELECT id, username, moodle_instance_id FROM teachers WHERE id = ?",
      [teacher_id]
    );

    if (teacherRows.length === 0) {
      return res.status(404).json({ message: "❌ Teacher not found." });
    }

    const teacher = teacherRows[0];

    // ✅ Ensure the course exists in the local database
    let [courseRows] = await db.promise().query(
      "SELECT id, moodle_instance_id FROM courses WHERE id = ?",
      [course_id]
    );

    if (courseRows.length === 0) {
      console.log(`⚠️ Course ID ${course_id} not found locally. Fetching from Moodle...`);

      // ✅ Get Moodle instance details
      const [instanceRows] = await db.promise().query("SELECT * FROM moodle_instances WHERE id = ?", [moodle_instance_id]);

      if (instanceRows.length === 0) {
        return res.status(404).json({ message: "❌ Moodle instance not found." });
      }

      const moodleInstance = instanceRows[0];

      // ✅ Fetch course from Moodle
      const moodleResponse = await axios.get(`${moodleInstance.base_url}/webservice/rest/server.php`, {
        params: {
          wstoken: moodleInstance.api_token,
          wsfunction: "core_course_get_courses",
          moodlewsrestformat: "json",
        },
      });

      const foundCourse = moodleResponse.data.find(course => course.id == course_id);

      if (!foundCourse) {
        console.error(`❌ Course ID ${course_id} not found in Moodle.`);
        return res.status(400).json({ message: `Course ID ${course_id} does not exist in Moodle.` });
      }

      console.log(`✅ Course Found in Moodle: ${foundCourse.fullname}`);

      // ✅ Insert course into the local database
      await db.promise().query(
        `INSERT INTO courses (id, fullname, shortname, moodle_instance_id) VALUES (?, ?, ?, ?)`,
        [foundCourse.id, foundCourse.fullname, foundCourse.shortname, moodle_instance_id]
      );

      console.log(`✅ Course ${foundCourse.fullname} inserted into local database.`);
      
      // ✅ Fetch the inserted course data again
      courseRows = [{ id: foundCourse.id, moodle_instance_id }];
    }

    // ✅ Allow teachers to be assigned to courses from ANY Moodle instance
    await db.promise().query(
      `INSERT INTO teacher_courses (teacher_id, course_id, moodle_instance_id) 
       VALUES (?, ?, ?) 
       ON DUPLICATE KEY UPDATE course_id = VALUES(course_id), moodle_instance_id = VALUES(moodle_instance_id)`,
      [teacher_id, course_id, moodle_instance_id]
    );

    console.log("✅ Course assigned successfully! Notify the frontend.");
    res.status(200).json({ message: "✅ Course assigned successfully! You can now log in." });

  } catch (error) {
    console.error("❌ Database error:", error);
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
  // ✅ Get all logbook entries
  // exports.getAllEntries = async (req, res) => {
  //   try {
  //       const [entries] = await db.promise().query(
  //           `SELECT le.id, le.case_number, le.entry_date, 
  //                   s.username AS student, c.fullname AS course, 
  //                   le.type_of_work, le.grade, le.feedback, le.status, 
  //                   le.media_link  -- ✅ Include media_link field
  //            FROM logbook_entries le
  //            JOIN users s ON le.student_id = s.id
  //            JOIN courses c ON le.course_id = c.id
  //            ORDER BY le.entry_date DESC`
  //       );
  
  //       res.json(entries);
  //   } catch (error) {
  //       console.error("❌ Database error:", error);
  //       res.status(500).json({ message: "Failed to fetch logbook entries", error: error.message });
  //   }
  // };
  
  
// ... (Your existing imports at the top of the file) ...

// ✅ Get all logbook entries (CORRECTED - Removed non-existent teacher_id join)
exports.getAllEntries = async (req, res) => {
  try {
    const [entries] = await db.promise().query(
      `SELECT
          le.id,
          le.case_number,
          le.entry_date,
          le.work_completed_date, -- ✅ Added: Completion date for the work
          le.type_of_work,
          le.grade,
          le.feedback,
          le.status,
          le.media_link,
          le.consent_form,    -- ✅ Added: Consent form status
          le.clinical_info,   -- ✅ Added: Clinical info/comments
          le.allow_resubmit,  -- ✅ Added: Flag for allowing resubmission
          s.username AS student,
          s.id AS student_id, -- ✅ Added: Student ID
          c.fullname AS course,
          c.id AS course_id,   -- ✅ Added: Course ID
          le.teacher_media_link
       FROM logbook_entries le
       JOIN users s ON le.student_id = s.id
       JOIN courses c ON le.course_id = c.id
       -- Removed: LEFT JOIN teachers t ON le.teacher_id = t.id (because le.teacher_id doesn't exist)
       -- Removed: t.username AS teacher_name, t.id AS teacher_id (because we can't join to teachers this way)
       ORDER BY le.entry_date DESC`
    );

    // ✅ IMPORTANT: Wrap the entries in an object to match frontend's expected structure
    //    (where frontend calls entriesResponse.data.entries)
    res.json({ entries });
  } catch (error) {
    console.error("❌ Database error:", error);
    res.status(500).json({ message: "Failed to fetch logbook entries", error: error.message });
  }
};

// ... (Rest of your controller code) ...
