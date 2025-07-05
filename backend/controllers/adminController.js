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



  exports.getTeachersWithCourses = async (req, res) => {
  try {
    const [results] = await db.promise().query(
      `SELECT t.id as teacher_id, t.username, t.email, c.id as course_id, c.fullname 
       FROM teachers t -- Corrected: JOIN 'teachers' table directly
       LEFT JOIN teacher_courses tc ON t.id = tc.teacher_id
       LEFT JOIN courses c ON tc.course_id = c.id
      `
    );
    res.json(results);
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ message: "Failed to fetch teachers with courses", error: error.message });
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
        `SELECT id, username, email FROM teachers` // Corrected: Select from 'teachers' table
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
          le.work_completed_date,
          le.type_of_work,
          le.task_type,
          le.grade,
          le.feedback,
          le.status,
          le.media_link,
          le.consent_form,
          le.clinical_info,
          le.allow_resubmit,
          s.username AS student,
          s.id AS student_id,
          c.fullname AS course,
          c.id AS course_id,
          t.username AS teacher_name,
          t.id AS teacher_id,
          le.teacher_media_link
       FROM logbook_entries le
       JOIN users s ON le.student_id = s.id
       JOIN courses c ON le.course_id = c.id
       LEFT JOIN teachers t ON le.graded_by_teacher_id = t.id -- This JOIN now correctly uses the new column
       ORDER BY le.entry_date DESC`
    );

    res.json({ entries });
  } catch (error) {
    console.error("❌ Database error (getAllEntries):", error);
    res.status(500).json({ message: "Failed to fetch logbook entries", error: error.message });
  }
};

// ✅ NEW ANALYTICS CONTROLLERS START HERE (Adhering to your table structure)

// Get Total Number of Students
exports.getTotalStudents = async (req, res) => {
    try {
        // Assuming 'users' table contains student records with role 'student'
        const [result] = await db.promise().query(
            "SELECT COUNT(*) AS totalStudents FROM users WHERE role = 'student'"
        );
        res.json({ totalStudents: result[0].totalStudents });
    } catch (error) {
        console.error("Error fetching total students:", error);
        res.status(500).json({ message: "Failed to fetch total students.", error: error.message });
    }
};

// Get Number of Entries per Course
exports.getEntriesPerCourse = async (req, res) => {
    try {
        const [results] = await db.promise().query(
            `SELECT 
                c.fullname AS courseName, 
                COUNT(le.id) AS totalEntries
             FROM logbook_entries le
             JOIN courses c ON le.course_id = c.id
             GROUP BY c.fullname
             ORDER BY totalEntries DESC`
        );
        res.json({ entriesPerCourse: results });
    } catch (error) {
        console.error("Error fetching entries per course:", error);
        res.status(500).json({ message: "Failed to fetch entries per course.", error: error.message });
    }
};

// Get Number of Entries by Month (for a given year, or overall)
exports.getEntriesByMonth = async (req, res) => {
    // You can optionally add a 'year' query parameter: /api/admin/analytics/entries-by-month?year=2023
    const year = req.query.year || new Date().getFullYear(); // Default to current year

    try {
        const [results] = await db.promise().query(
            `SELECT
                DATE_FORMAT(entry_date, '%Y-%m') AS monthYear,
                COUNT(id) AS totalEntries
             FROM logbook_entries
             WHERE YEAR(entry_date) = ?
             GROUP BY monthYear
             ORDER BY monthYear ASC`,
            [year]
        );
        // Ensure all months are present, even if no entries (for consistent charts)
        const monthlyData = Array.from({ length: 12 }, (_, i) => {
            const monthNum = i + 1;
            const monthString = `${year}-${monthNum < 10 ? '0' : ''}${monthNum}`;
            const existing = results.find(item => item.monthYear === monthString);
            return { monthYear: monthString, totalEntries: existing ? existing.totalEntries : 0 };
        });

        res.json({ entriesByMonth: monthlyData });
    } catch (error) {
        console.error("Error fetching entries by month:", error);
        res.status(500).json({ message: "Failed to fetch entries by month.", error: error.message });
    }
};

// Get Summary of Entry Status (Submitted, Graded, Synced, Draft - though draft entries likely not saved)
exports.getEntryStatusSummary = async (req, res) => {
    try {
        const [results] = await db.promise().query(
            `SELECT 
                status, 
                COUNT(id) AS count
             FROM logbook_entries
             GROUP BY status`
        );
        // Map to a more readable format for frontend if needed, or ensure all statuses are represented
        const statusSummary = {
            submitted: 0,
            //graded: 0,
            synced: 0,
            // Assuming 'draft' isn't a primary status stored in logbook_entries that would need explicit count
        };
        results.forEach(item => {
            if (statusSummary.hasOwnProperty(item.status)) {
                statusSummary[item.status] = item.count;
            }
        });

        // Convert to array of objects for Recharts PieChart
        const formattedResults = Object.keys(statusSummary).map(status => ({
            name: status.charAt(0).toUpperCase() + status.slice(1), // Capitalize first letter
            value: statusSummary[status]
        }));


        res.json({ entryStatusSummary: formattedResults });
    } catch (error) {
        console.error("Error fetching entry status summary:", error);
        res.status(500).json({ message: "Failed to fetch entry status summary.", error: error.message });
    }
};

// ✅ NEW ANALYTICS CONTROLLERS END HERE

// ✅ NEW ANALYTICS CONTROLLERS (Student-Specific) START HERE

// Get All Students (for dropdown)
exports.getAllStudents = async (req, res) => {
    try {
        const [students] = await db.promise().query(
            "SELECT id, username, email FROM users WHERE role = 'student' ORDER BY username ASC"
        );
        res.json({ students });
    } catch (error) {
        console.error("Error fetching all students:", error);
        res.status(500).json({ message: "Failed to fetch students.", error: error.message });
    }
};

// Get Number of Entries by Month for a specific student
exports.getStudentEntriesByMonth = async (req, res) => {
    const { studentId } = req.params;
    const year = req.query.year || new Date().getFullYear();

    try {
        const [results] = await db.promise().query(
            `SELECT
                DATE_FORMAT(entry_date, '%Y-%m') AS monthYear,
                COUNT(id) AS totalEntries
             FROM logbook_entries
             WHERE student_id = ? AND YEAR(entry_date) = ?
             GROUP BY monthYear
             ORDER BY monthYear ASC`,
            [studentId, year]
        );
        const monthlyData = Array.from({ length: 12 }, (_, i) => {
            const monthNum = i + 1;
            const monthString = `${year}-${monthNum < 10 ? '0' : ''}${monthNum}`;
            const existing = results.find(item => item.monthYear === monthString);
            return { monthYear: monthString, totalEntries: existing ? existing.totalEntries : 0 };
        });

        res.json({ studentEntriesByMonth: monthlyData });
    } catch (error) {
        console.error(`Error fetching entries by month for student ${studentId}:`, error);
        res.status(500).json({ message: `Failed to fetch entries by month for student ${studentId}.`, error: error.message });
    }
};

// Get Summary of Entry Status for a specific student
exports.getStudentEntryStatusSummary = async (req, res) => {
    const { studentId } = req.params;

    try {
        const [results] = await db.promise().query(
            `SELECT 
                status, 
                COUNT(id) AS count
             FROM logbook_entries
             WHERE student_id = ?
             GROUP BY status`,
            [studentId]
        );
        const statusSummary = {
            submitted: 0,
            graded: 0,
            synced: 0,
        };
        results.forEach(item => {
            if (statusSummary.hasOwnProperty(item.status)) {
                statusSummary[item.status] = item.count;
            }
        });
        const formattedResults = Object.keys(statusSummary).map(status => ({
            name: status.charAt(0).toUpperCase() + status.slice(1),
            value: statusSummary[status]
        }));
        res.json({ studentEntryStatusSummary: formattedResults });
    } catch (error) {
        console.error(`Error fetching entry status summary for student ${studentId}:`, error);
        res.status(500).json({ message: `Failed to fetch entry status summary for student ${studentId}.`, error: error.message });
    }
};

// ✅ NEW ANALYTICS CONTROLLERS (Student-Specific) END HERE
