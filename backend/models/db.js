const mysql = require("mysql2");

const db = mysql.createPool({
  connectionLimit: 100,           // Allows many connections
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  queueLimit: 0                   // No limit on queued requests
});

module.exports = db;
