// server.js
const express = require("express");
const cors = require("cors");
const db = require("./db"); // your db.js for MySQL connection
const path = require("path");
const multer = require("multer");

const app = express();
const PORT = process.env.PORT || 10000;

// ---------- MIDDLEWARE ----------
app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, "public"))); 

// ---------- MULTER SETUP ----------
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Ensure the uploads folder exists
        const uploadPath = path.join(__dirname, "uploads/works");
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === "video/mp4") cb(null, true);
        else cb(new Error("Only MP4 videos allowed"));
    }
});

// ---------- ROUTES ----------

// Serve login.html for root
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public/login.html"));
});

// Example: Serve dashboard.html if you have one
app.get("/dashboard", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

// ----------------------
// AUTH
// ----------------------
app.post("/api/register", (req, res) => {
    const { full_name, email, password } = req.body;
    const role = "CLIENT";

    if (!full_name || !email || !password)
        return res.status(400).json({ message: "All fields are required" });

    const sql = "INSERT INTO users (full_name, email, password, role) VALUES (?, ?, ?, ?)";
    db.query(sql, [full_name, email, password, role], (err, result) => {
        if (err) {
            console.error(err);
            if (err.code === "ER_DUP_ENTRY")
                return res.status(409).json({ message: "Email already exists" });
            return res.status(500).json({ message: "Registration failed" });
        }
        res.json({ message: "Registration successful", userId: result.insertId });
    });
});

app.post("/api/login", (req, res) => {
    const { email, password } = req.body;

    if (!email || !password)
        return res.status(400).json({ message: "Email and password required" });

    const sql = "SELECT id, full_name, role FROM users WHERE email=? AND password=?";
    db.query(sql, [email, password], (err, result) => {
        if (err) {
            console.error("LOGIN ERROR:", err);
            return res.status(500).json({ message: err.message });
        }
        if (result.length === 0)
            return res.status(401).json({ message: "Invalid email or password" });
        res.json({ message: "Login successful", user: result[0] });
    });
});

// ----------------------
// SERVICES
// ----------------------
app.get("/api/services", (req, res) => {
    db.query("SELECT * FROM services", (err, result) => {
        if (err) return res.status(500).json({ message: "Server error" });
        res.json(result);
    });
});

// You can add POST, PUT, DELETE for services here...

// ----------------------
// BOOKINGS
// ----------------------
app.get("/api/bookings/:clientId", (req, res) => {
    const { clientId } = req.params;
    const sql = `
        SELECT b.id, s.service_name, b.booking_date, b.status
        FROM bookings b
        JOIN services s ON b.service_id = s.id
        WHERE b.client_id = ?
        ORDER BY b.booking_date DESC
    `;
    db.query(sql, [clientId], (err, results) => {
        if (err) return res.status(500).json({ message: err.message });
        res.json(results);
    });
});

app.post("/api/bookings", (req, res) => {
    const { client_id, service_id, booking_date } = req.body;
    if (!client_id || !service_id || !booking_date)
        return res.status(400).json({ message: "Client ID, Service ID, and date are required" });

    const sql = "INSERT INTO bookings (client_id, service_id, booking_date, status) VALUES (?, ?, ?, 'PENDING')";
    db.query(sql, [client_id, service_id, booking_date], (err, result) => {
        if (err) return res.status(500).json({ message: "Failed to create booking" });
        res.json({ message: "Booking created successfully", bookingId: result.insertId });
    });
});

// ----------------------
// WORKS
// ----------------------
app.get("/api/works", (req, res) => {
    db.query("SELECT * FROM works ORDER BY created_at DESC", (err, results) => {
        if (err) return res.status(500).json({ message: "Failed to load works" });
        res.json(results);
    });
});

// ----------------------
// START SERVER
// ----------------------
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));


