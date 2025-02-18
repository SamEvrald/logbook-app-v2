const express = require('express');
const { login, teacherLogin } = require('../controllers/authController');
const router = express.Router();

// Routes
router.post('/login', login); // Student Login via Moodle
router.post('/teacher-login', teacherLogin); // Teacher Login via Manual Credentials

module.exports = router;
