import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || "default-secret-key";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin-password";

// Database Setup
const db = new Database("auth_tracker.db");
db.pragma("journal_mode = WAL");

// Initialize Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'employee'
  );

  CREATE TABLE IF NOT EXISTS auth_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    visit_type TEXT,
    insurance TEXT,
    insurance_id TEXT,
    patient_name TEXT,
    dob TEXT,
    account_number TEXT,
    p_r TEXT,
    doctor_name TEXT,
    procedure_codes TEXT,
    dx_codes TEXT,
    status TEXT DEFAULT 'Pending',
    request_initiated TEXT,
    insurance_portal_name TEXT,
    rep_name TEXT,
    phone_number TEXT,
    auth_case_number TEXT,
    ref_number TEXT,
    date_worked TEXT,
    call_time_spent TEXT,
    checklist TEXT,
    notes TEXT,
    is_deleted INTEGER DEFAULT 0,
    user_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Migration: Add is_deleted column if it doesn't exist
const tableInfo = db.prepare("PRAGMA table_info(auth_records)").all();
const hasIsDeleted = tableInfo.some((col: any) => col.name === 'is_deleted');
if (!hasIsDeleted) {
  console.log("Adding is_deleted column to auth_records table...");
  db.prepare("ALTER TABLE auth_records ADD COLUMN is_deleted INTEGER DEFAULT 0").run();
}

// Migration: Rename reason to doctor_name if it exists
const authRecordsInfo = db.prepare("PRAGMA table_info(auth_records)").all();
const hasReason = authRecordsInfo.some((col: any) => col.name === 'reason');
const hasDoctorName = authRecordsInfo.some((col: any) => col.name === 'doctor_name');
if (hasReason && !hasDoctorName) {
  console.log("Renaming reason column to doctor_name...");
  db.prepare("ALTER TABLE auth_records RENAME COLUMN reason TO doctor_name").run();
}

// Migration: Add user_id column to auth_records if it doesn't exist
const hasUserId = authRecordsInfo.some((col: any) => col.name === 'user_id');
if (!hasUserId) {
  console.log("Adding user_id column to auth_records table...");
  db.prepare("ALTER TABLE auth_records ADD COLUMN user_id INTEGER").run();
  // Assign existing records to admin user (assuming admin is ID 1)
  db.prepare("UPDATE auth_records SET user_id = 1 WHERE user_id IS NULL").run();
}

// Migration: Add notes column to auth_records if it doesn't exist
const hasNotes = authRecordsInfo.some((col: any) => col.name === 'notes');
if (!hasNotes) {
  console.log("Adding notes column to auth_records table...");
  db.prepare("ALTER TABLE auth_records ADD COLUMN notes TEXT").run();
}

const userTableInfo = db.prepare("PRAGMA table_info(users)").all();
const hasRole = userTableInfo.some((col: any) => col.name === 'role');
if (!hasRole) {
  console.log("Adding role column to users table...");
  db.prepare("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'employee'").run();
  db.prepare("UPDATE users SET role = 'admin' WHERE username = 'admin'").run();
}

// Seed Admin User if not exists
const adminUser: any = db.prepare("SELECT * FROM users WHERE username = ?").get("admin");
if (!adminUser) {
  const hashedPassword = bcrypt.hashSync(ADMIN_PASSWORD, 10);
  db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run("admin", hashedPassword, "admin");
} else if (bcrypt.compareSync("admin", adminUser.password)) {
  // If password is still the old default "admin", update it to "admin-password"
  const hashedPassword = bcrypt.hashSync("admin-password", 10);
  db.prepare("UPDATE users SET password = ?, role = 'admin' WHERE username = ?").run(hashedPassword, "admin");
}

async function startServer() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  // Auth Middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    jwt.verify(token, SESSION_SECRET, (err: any, user: any) => {
      if (err) return res.status(403).json({ error: "Forbidden" });
      req.user = user;
      next();
    });
  };

  const isAdmin = (req: any, res: any, next: any) => {
    const user: any = db.prepare("SELECT role FROM users WHERE id = ?").get(req.user.id);
    if (user && user.role === 'admin') {
      next();
    } else {
      res.status(403).json({ error: "Admin access required" });
    }
  };

  // Auth Routes
  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;
    const user: any = db.prepare("SELECT * FROM users WHERE username = ?").get(username);

    if (user && bcrypt.compareSync(password, user.password)) {
      console.log(`Login successful for: ${username} (ID: ${user.id}, Role: ${user.role})`);
      const token = jwt.sign({ id: user.id, username: user.username }, SESSION_SECRET, { expiresIn: "24h" });
      res.cookie("token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 24 * 60 * 60 * 1000,
      });
      res.json({ success: true, user: { id: user.id, username: user.username, role: user.role } });
    } else {
      console.log(`Failed login attempt for user: ${username}`);
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    res.cookie("token", "", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      expires: new Date(0),
    });
    res.json({ success: true });
  });

  app.get("/api/auth/me", authenticateToken, (req: any, res) => {
    const user: any = db.prepare("SELECT id, username, role FROM users WHERE id = ?").get(req.user.id);
    res.json({ user });
  });

  // User Management (Admin Only)
  app.get("/api/users", authenticateToken, isAdmin, (req, res) => {
    const users = db.prepare("SELECT id, username, role FROM users").all();
    res.json(users);
  });

  app.get("/api/users/stats", authenticateToken, isAdmin, (req, res) => {
    const stats = db.prepare(`
      SELECT 
        u.id, 
        u.username, 
        u.role,
        SUM(CASE WHEN date(r.created_at, 'localtime') = date('now', 'localtime') THEN 1 ELSE 0 END) as today,
        SUM(CASE WHEN strftime('%W', r.created_at, 'localtime') = strftime('%W', 'now', 'localtime') AND strftime('%Y', r.created_at, 'localtime') = strftime('%Y', 'now', 'localtime') THEN 1 ELSE 0 END) as this_week,
        SUM(CASE WHEN strftime('%m', r.created_at, 'localtime') = strftime('%m', 'now', 'localtime') AND strftime('%Y', r.created_at, 'localtime') = strftime('%Y', 'now', 'localtime') THEN 1 ELSE 0 END) as this_month,
        SUM(CASE WHEN strftime('%Y', r.created_at, 'localtime') = strftime('%Y', 'now', 'localtime') THEN 1 ELSE 0 END) as ytd
      FROM users u
      LEFT JOIN auth_records r ON u.id = r.user_id AND r.is_deleted = 0
      GROUP BY u.id, u.username, u.role
      ORDER BY u.role, u.username
    `).all();
    res.json(stats);
  });

  app.post("/api/users", authenticateToken, isAdmin, (req, res) => {
    const { username, password, role } = req.body;
    try {
      const hashedPassword = bcrypt.hashSync(password, 10);
      db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run(username, hashedPassword, role || 'employee');
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: "Username already exists" });
    }
  });

  app.patch("/api/users/:id", authenticateToken, isAdmin, (req, res) => {
    const { id } = req.params;
    const { username, password, role } = req.body;
    
    try {
      if (password) {
        const hashedPassword = bcrypt.hashSync(password, 10);
        db.prepare("UPDATE users SET username = ?, password = ?, role = ? WHERE id = ?").run(username, hashedPassword, role, id);
      } else {
        db.prepare("UPDATE users SET username = ?, role = ? WHERE id = ?").run(username, role, id);
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: "Username already exists or update failed" });
    }
  });

  app.delete("/api/users/:id", authenticateToken, isAdmin, (req, res) => {
    const { id } = req.params;
    const user: any = db.prepare("SELECT username FROM users WHERE id = ?").get(id);
    if (user && user.username === 'admin') {
      return res.status(400).json({ error: "Cannot delete primary admin" });
    }
    db.prepare("DELETE FROM users WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.post("/api/auth/change-password", authenticateToken, (req: any, res) => {
    const { currentPassword, newPassword } = req.body;
    const user: any = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);

    if (user && bcrypt.compareSync(currentPassword, user.password)) {
      const hashedPassword = bcrypt.hashSync(newPassword, 10);
      db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashedPassword, user.id);
      res.json({ success: true });
    } else {
      res.status(400).json({ error: "Invalid current password" });
    }
  });

  // Record Routes
  app.get("/api/records", authenticateToken, (req, res) => {
    const records = db.prepare("SELECT * FROM auth_records WHERE is_deleted = 0 ORDER BY date_worked DESC").all();
    res.json(records);
  });

  app.get("/api/records/deleted", authenticateToken, (req, res) => {
    const records = db.prepare("SELECT * FROM auth_records WHERE is_deleted = 1 ORDER BY updated_at DESC").all();
    res.json(records);
  });

  app.get("/api/records/stats", authenticateToken, (req, res) => {
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'Pending' AND is_deleted = 0 THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'Approved' AND is_deleted = 0 THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'Denied' AND is_deleted = 0 THEN 1 ELSE 0 END) as denied,
        SUM(CASE WHEN status = 'Not Required' AND is_deleted = 0 THEN 1 ELSE 0 END) as not_required,
        SUM(CASE WHEN status = 'Follow Up' AND is_deleted = 0 THEN 1 ELSE 0 END) as follow_up,
        SUM(CASE WHEN status = 'Cancelled' AND is_deleted = 0 THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN status = 'Not Covered' AND is_deleted = 0 THEN 1 ELSE 0 END) as not_covered,
        SUM(CASE WHEN date(request_initiated) = date('now') AND is_deleted = 0 THEN 1 ELSE 0 END) as submitted_today
      FROM auth_records
      WHERE is_deleted = 0
    `).get();
    res.json(stats);
  });

  app.post("/api/records", authenticateToken, (req, res) => {
    const {
      visit_type, insurance, insurance_id, patient_name, dob, account_number,
      p_r, doctor_name, procedure_codes, dx_codes, status, request_initiated,
      insurance_portal_name, rep_name, phone_number, auth_case_number,
      ref_number, date_worked, call_time_spent, checklist, notes
    } = req.body;

    const userId = (req as any).user.id;
    console.log(`Creating record for user ID: ${userId} (${(req as any).user.username})`);

    const result = db.prepare(`
      INSERT INTO auth_records (
        visit_type, insurance, insurance_id, patient_name, dob, account_number,
        p_r, doctor_name, procedure_codes, dx_codes, status, request_initiated,
        insurance_portal_name, rep_name, phone_number, auth_case_number,
        ref_number, date_worked, call_time_spent, checklist, notes, user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      visit_type, insurance, insurance_id, patient_name, dob, account_number,
      p_r, doctor_name, procedure_codes, dx_codes, status, request_initiated,
      insurance_portal_name, rep_name, phone_number, auth_case_number,
      ref_number, date_worked, call_time_spent, JSON.stringify(checklist), notes, userId
    );

    res.json({ id: result.lastInsertRowid });
  });

  app.put("/api/records/:id", authenticateToken, (req, res) => {
    const { id } = req.params;
    const {
      visit_type, insurance, insurance_id, patient_name, dob, account_number,
      p_r, doctor_name, procedure_codes, dx_codes, status, request_initiated,
      insurance_portal_name, rep_name, phone_number, auth_case_number,
      ref_number, date_worked, call_time_spent, checklist, notes
    } = req.body;

    db.prepare(`
      UPDATE auth_records SET
        visit_type = ?, insurance = ?, insurance_id = ?, patient_name = ?, dob = ?, 
        account_number = ?, p_r = ?, doctor_name = ?, procedure_codes = ?, dx_codes = ?, 
        status = ?, request_initiated = ?, insurance_portal_name = ?, rep_name = ?, 
        phone_number = ?, auth_case_number = ?, ref_number = ?, date_worked = ?, 
        call_time_spent = ?, checklist = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      visit_type, insurance, insurance_id, patient_name, dob, account_number,
      p_r, doctor_name, procedure_codes, dx_codes, status, request_initiated,
      insurance_portal_name, rep_name, phone_number, auth_case_number,
      ref_number, date_worked, call_time_spent, JSON.stringify(checklist), notes,
      id
    );

    res.json({ success: true });
  });

  app.delete("/api/records/:id", authenticateToken, isAdmin, (req, res) => {
    console.log(`Soft deleting record: ${req.params.id}`);
    const result = db.prepare("UPDATE auth_records SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
    console.log(`Rows affected: ${result.changes}`);
    res.json({ success: true });
  });

  app.post("/api/records/:id/restore", authenticateToken, (req, res) => {
    console.log(`Restoring record: ${req.params.id}`);
    db.prepare("UPDATE auth_records SET is_deleted = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/records/:id/permanent", authenticateToken, isAdmin, (req, res) => {
    console.log(`Permanently deleting record: ${req.params.id}`);
    db.prepare("DELETE FROM auth_records WHERE id = ? AND is_deleted = 1").run(req.params.id);
    res.json({ success: true });
  });

  // Settings Routes
  app.get("/api/settings", authenticateToken, (req, res) => {
    const settings = db.prepare("SELECT * FROM settings").all();
    const settingsMap = settings.reduce((acc: any, curr: any) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
    res.json(settingsMap);
  });

  app.post("/api/settings", authenticateToken, (req, res) => {
    const { key, value } = req.body;
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, value);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
