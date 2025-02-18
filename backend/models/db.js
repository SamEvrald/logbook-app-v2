const mysql = require("mysql2");

const db = mysql.createPool({
  host: "localhost",
  user: "sam",
  password: "Nexa721Li",
  database: "logbook_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = db;
