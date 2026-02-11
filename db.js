const mysql = require("mysql2");

const connection = mysql.createConnection({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port:process.env.MYSQLPORT,
  ssl:{
    rejectUnauthorized: false
  }
});

db.connect((err) => {
  if (err) {
    console.error("MySQL connection error:", err);
  } else {
    console.log("MySQL connected successfully (Railway)");
  }
});

module.exports = db;




