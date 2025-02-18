<<<<<<< HEAD
CREATE DATABASE logbook_db;
USE logbook_db;

-- ✅ Admins Table
CREATE TABLE admins (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ✅ Teachers Table
CREATE TABLE teachers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ✅ Users Table (For Students)
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(255) NOT NULL,
    password VARCHAR(255),
    role ENUM('student', 'teacher', 'admin') DEFAULT 'student',
    moodle_id INT UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ✅ Courses Table (Pulled from Moodle)
CREATE TABLE courses (
    id INT PRIMARY KEY,
    fullname VARCHAR(255) NOT NULL,
    shortname VARCHAR(50) NOT NULL
);

-- ✅ Teacher Courses Table (Mapping Teachers to Courses)
CREATE TABLE teacher_courses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    teacher_id INT NOT NULL,
    course_id INT NOT NULL,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- ✅ Logbook Entries Table (Student Submissions)
CREATE TABLE logbook_entries (
    id INT PRIMARY KEY AUTO_INCREMENT,
    case_number VARCHAR(50) UNIQUE,
    student_id INT NOT NULL,
    course_id INT NOT NULL,
    role_in_task ENUM('leader', 'observer', 'collaborator') NOT NULL,
    type_of_work VARCHAR(255) NOT NULL,
    pathology VARCHAR(255),
    clinical_info TEXT,
    content TEXT NOT NULL,
    consent_form ENUM('yes', 'no') NOT NULL,
    files JSON,
    media_link VARCHAR(255),
    status ENUM('submitted', 'graded') DEFAULT 'submitted',
    grade DECIMAL(5,2),
    feedback TEXT,
    entry_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    work_completed_date DATE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- ✅ Entry Files Table (For Storing File Paths)
CREATE TABLE entry_files (
    id INT PRIMARY KEY AUTO_INCREMENT,
    entry_id INT NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    FOREIGN KEY (entry_id) REFERENCES logbook_entries(id) ON DELETE CASCADE
);
=======
-- CREATE DATABASE logbook_db;
-- USE logbook_db;

-- -- ✅ Admins Table
-- CREATE TABLE admins (
--     id INT PRIMARY KEY AUTO_INCREMENT,
--     username VARCHAR(255) NOT NULL,
--     email VARCHAR(255) UNIQUE NOT NULL,
--     password VARCHAR(255) NOT NULL,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- -- ✅ Teachers Table
-- CREATE TABLE teachers (
--     id INT PRIMARY KEY AUTO_INCREMENT,
--     username VARCHAR(255) NOT NULL,
--     email VARCHAR(255) UNIQUE NOT NULL,
--     password VARCHAR(255) NOT NULL,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- -- ✅ Users Table (For Students)
-- CREATE TABLE users (
--     id INT PRIMARY KEY AUTO_INCREMENT,
--     username VARCHAR(255) NOT NULL,
--     password VARCHAR(255),
--     role ENUM('student', 'teacher', 'admin') DEFAULT 'student',
--     moodle_id INT UNIQUE,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- -- ✅ Courses Table (Pulled from Moodle)
-- CREATE TABLE courses (
--     id INT PRIMARY KEY,
--     fullname VARCHAR(255) NOT NULL,
--     shortname VARCHAR(50) NOT NULL
-- );

-- -- ✅ Teacher Courses Table (Mapping Teachers to Courses)
-- CREATE TABLE teacher_courses (
--     id INT PRIMARY KEY AUTO_INCREMENT,
--     teacher_id INT NOT NULL,
--     course_id INT NOT NULL,
--     FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
--     FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
-- );

-- -- ✅ Logbook Entries Table (Student Submissions)
-- CREATE TABLE logbook_entries (
--     id INT PRIMARY KEY AUTO_INCREMENT,
--     case_number VARCHAR(50) UNIQUE,
--     student_id INT NOT NULL,
--     course_id INT NOT NULL,
--     role_in_task ENUM('leader', 'observer', 'collaborator') NOT NULL,
--     type_of_work VARCHAR(255) NOT NULL,
--     pathology VARCHAR(255),
--     clinical_info TEXT,
--     content TEXT NOT NULL,
--     consent_form ENUM('yes', 'no') NOT NULL,
--     files JSON,
--     media_link VARCHAR(255),
--     status ENUM('submitted', 'graded') DEFAULT 'submitted',
--     grade DECIMAL(5,2),
--     feedback TEXT,
--     entry_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     work_completed_date DATE,
--     FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
--     FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
-- );

-- -- ✅ Entry Files Table (For Storing File Paths)
-- CREATE TABLE entry_files (
--     id INT PRIMARY KEY AUTO_INCREMENT,
--     entry_id INT NOT NULL,
--     file_path VARCHAR(255) NOT NULL,
--     FOREIGN KEY (entry_id) REFERENCES logbook_entries(id) ON DELETE CASCADE
-- );
>>>>>>> 5c17eff (🔄 Synced logbook assignments with Moodle and implemented grading sync)
