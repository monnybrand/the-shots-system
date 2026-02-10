const mysql = require("mysql2");

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",          // your MySQL password
    database: "videography_sme"
});

db.connect(err => {
    if (err) console.error("DB connection error:", err);
    else console.log("✅ MySQL Connected");
});

module.exports = db;
