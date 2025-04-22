const mysql = require("mysql2");

const db = mysql.createPool({
  connectionLimit: 100,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  queueLimit: 0
});

db.on('acquire', function (connection) {
  console.log('📥 Connection %d acquired', connection.threadId);
});

db.on('release', function (connection) {
  console.log('📤 Connection %d released', connection.threadId);
});

module.exports = db;


