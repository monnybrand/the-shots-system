
const express = require("express");
const cors = require("cors");
const db = require("./db");
const path = require("path");
const multer = require("multer");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public"))); // serve frontend


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, "uploads/works"));
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


// ----------------------
// REGISTER
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
            if (err.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "Email already exists" });
            return res.status(500).json({ message: "Registration failed" });
        }
        res.json({ message: "Registration successful", userId: result.insertId });
    });
});

// ----------------------
// LOGIN
// ----------------------
app.post("/api/login", (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) return res.status(400).json({ message: "Email and password required" });

    const sql = "SELECT id, full_name, role FROM users WHERE email=? AND password=?";
    db.query(sql, [email, password], (err, result) => {
        if (err) {
                console.error("LOGIN ERROR:", err);
                return res.status(500).json({ message: err.message });}
        if (result.length === 0) return res.status(401).json({ message: "Invalid email or password" });
        res.json({ message: "Login successful", user: result[0] });
    });
});

// ----------------------
// SERVICES CRUD
// ----------------------
app.get("/api/services", (req, res) => {
    db.query("SELECT * FROM services", (err, result) => {
        if (err) return res.status(500).json({ message: "Server error" });
        res.json(result);
    });
});

app.post("/api/services", (req, res) => {
    const { service_name, description, price } = req.body;
    if (!service_name || !description || !price) return res.status(400).json({ message: "All fields are required" });

    db.query("INSERT INTO services (service_name, description, price) VALUES (?, ?, ?)", [service_name, description, price], err => {
        if (err) return res.status(500).json({ message: "Failed to add service" });
        res.json({ message: "Service added successfully" });
    });
});

app.put("/api/services/:id", (req, res) => {
    const { id } = req.params;
    const { service_name, description, price } = req.body;
    const sql = "UPDATE services SET service_name=?, description=?, price=? WHERE id=?";
    db.query(sql, [service_name, description, price, id], err => {
        if (err) return res.status(500).json({ message: "Failed to update service" });
        res.json({ message: "Service updated successfully" });
    });
});

app.delete("/api/services/:id", (req, res) => {
    const { id } = req.params;
    db.query("DELETE FROM services WHERE id=?", [id], err => {
        if (err) return res.status(500).json({ message: "Failed to delete service" });
        res.json({ message: "Service deleted successfully" });
    });
});

// ----------------------
// BOOKINGS
// ----------------------


// ----------------------
// GET ALL BOOKINGS (for admin dashboard)
// ----------------------
app.get("/api/bookings", (req, res) => {
    const sql = `
        SELECT b.id, u.full_name AS client_name, s.service_name, b.booking_date, b.status
        FROM bookings b
        JOIN users u ON b.client_id = u.id
        JOIN services s ON b.service_id = s.id
        ORDER BY b.booking_date DESC
    `;
    db.query(sql, (err, results) => {
        if (err) {
            console.error("Failed to load bookings", err);
            return res.status(500).json({ message: "Failed to load bookings" });
        }
        res.json(results);
    });
});

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
        if(err){
            console.error("CLIENT BOOKINGS ERROR:", err);
            return res.status(500).json({ message: err.message });
        }
        res.json(results);
    });
});


app.put("/api/bookings/:id/status", (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    db.query("UPDATE bookings SET status=? WHERE id=?", [status, id], err => {
        if (err) {
            console.error("BOOKINGS ERROR:", err);
            return res.status(500).json({ message: err.message });}
        res.json({ message: `Booking ${status.toLowerCase()} successfully` });
    });
});


// CLIENT BOOKING: create a new booking with event date
app.post("/api/bookings", (req, res) => {
    const { client_id, service_id, booking_date } = req.body;

    if (!client_id || !service_id || !booking_date) {
        return res.status(400).json({ message: "Client ID, Service ID, and event date are required" });
    }

    const sql = "INSERT INTO bookings (client_id, service_id, booking_date, status) VALUES (?, ?, ?, 'PENDING')";
    db.query(sql, [client_id, service_id, booking_date], (err, result) => {
        if (err) {
            console.error("Booking creation error:", err);
            return res.status(500).json({ message: "Failed to create booking" });
        }
        res.json({ message: "Booking created successfully", bookingId: result.insertId });
    });
});


//UPLOAD WORKS



// ----------------------
// DASHBOARD STATS
// ----------------------
app.get("/api/dashboard-stats", (req, res) => {
    const stats = {};
    db.query("SELECT COUNT(*) AS totalUsers FROM users", (err, result) => {
        if (err) return res.status(500).json({ message: "Server error" });
        stats.totalUsers = result[0].totalUsers;

        db.query("SELECT COUNT(*) AS totalServices FROM services", (err, result) => {
            if (err) return res.status(500).json({ message: "Server error" });
            stats.totalServices = result[0].totalServices;

            db.query("SELECT COUNT(*) AS totalBookings FROM bookings", (err, result) => {
                if (err) return res.status(500).json({ message: "Server error" });
                stats.totalBookings = result[0].totalBookings;

                db.query("SELECT COUNT(*) AS approvedBookings FROM bookings WHERE status='APPROVED'", (err, result) => {
                    if (err) return res.status(500).json({ message: "Server error" });
                    stats.approvedBookings = result[0].approvedBookings;

                    db.query("SELECT COUNT(*) AS pendingBookings FROM bookings WHERE status='PENDING'", (err, result) => {
                        if (err) return res.status(500).json({ message: "Server error" });
                        stats.pendingBookings = result[0].pendingBookings;

                        db.query("SELECT COUNT(*) AS rejectedBookings FROM bookings WHERE status='REJECTED'", (err, result) => {
                            if (err) return res.status(500).json({ message: "Server error" });
                            stats.rejectedBookings = result[0].rejectedBookings;

                            res.json(stats);
                        });
                    });
                });
            });
        });
    });
});

app.get("/api/works", (req, res) => {
    db.query("SELECT * FROM works ORDER BY created_at DESC", (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Failed to load works" });
        }
        res.json(results);
    });
});

//ADD WORK
app.post("/api/works", (req, res) => {
    const { title, category, video_url, description } = req.body;

    if (!title || !category || !video_url)
        return res.status(400).json({ message: "Required fields missing" });

    const sql = `
        INSERT INTO works (title, category, video_url, description)
        VALUES (?, ?, ?, ?)
    `;

    db.query(sql, [title, category, video_url, description], err => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Failed to add work" });
        }
        res.json({ message: "Work added successfully" });
    });
});

//DELETE WORK
app.delete("/api/works/:id", (req, res) => {
    db.query("DELETE FROM works WHERE id=?", [req.params.id], err => {
        if (err) return res.status(500).json({ message: "Failed to delete work" });
        res.json({ message: "Work deleted" });
    });
});


// ----------------------
// DEFAULT PAGE
// ----------------------
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public/login.html"));
});

// ----------------------
// START SERVER
// ----------------------
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
