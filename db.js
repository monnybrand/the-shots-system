// db.js
const mysql = require("mysql2");

// Create MySQL connection using Railway environment variables
const db = mysql.createConnection({
  host: process.env.MYSQLHOST,        // Railway MySQL host
  user: process.env.MYSQLUSER,        // Railway MySQL user
  password: process.env.MYSQLPASSWORD,// Railway MySQL password
  database: process.env.MYSQLDATABASE,// Railway MySQL database name
  port: process.env.MYSQLPORT || 3306,
  ssl: { rejectUnauthorized: false }  // Required for Railway SSL
});

// Connect to MySQL
db.connect((err) => {
  if (err) {
    console.error("❌ MySQL connection error:", err);
  } else {
    console.log("✅ MySQL connected successfully (Railway)");
  }
});

module.exports = db;
