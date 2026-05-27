const express = require('express');
const path = require('path');
const initSqlJs = require('sql.js');
const fs = require('fs');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'bookings.db');

let config = {};
const configPath = path.join(__dirname, 'config.json');
if (fs.existsSync(configPath)) {
  try { config = JSON.parse(fs.readFileSync(configPath, 'utf8')); } catch {}
}

const transporter = nodemailer.createTransport({
  host: config.smtpHost || 'smtp.gmail.com',
  port: config.smtpPort || 587,
  secure: config.smtpSecure || false,
  auth: {
    user: config.smtpUser || '',
    pass: config.smtpPass || '',
  },
});

async function sendNotification(booking) {
  if (!config.smtpUser || !config.smtpPass) return;
  const mailOptions = {
    from: `"Haoua Beauty Center" <${process.env.SMTP_USER}>`,
    to: config.notifyEmail || config.smtpUser,
    subject: `New Booking - ${booking.name} - ${booking.service}`,
    html: `
      <h2>New Appointment Booking</h2>
      <table style="border-collapse:collapse;width:100%;max-width:500px;">
        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Name</td><td style="padding:8px;border:1px solid #ddd;">${booking.name}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Phone</td><td style="padding:8px;border:1px solid #ddd;">${booking.phone}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Email</td><td style="padding:8px;border:1px solid #ddd;">${booking.email || '—'}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Date</td><td style="padding:8px;border:1px solid #ddd;">${booking.date}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Time</td><td style="padding:8px;border:1px solid #ddd;">${booking.time}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Service</td><td style="padding:8px;border:1px solid #ddd;">${booking.service}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Notes</td><td style="padding:8px;border:1px solid #ddd;">${booking.description || '—'}</td></tr>
      </table>
      <p><a href="http://localhost:3000/admin" style="display:inline-block;padding:10px 20px;background:#c4845a;color:white;text-decoration:none;border-radius:6px;">View in Admin Panel</a></p>
    `,
  };
  try { await transporter.sendMail(mailOptions); } catch {}
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/admin', (req, res) => res.redirect('/admin.html'));

let db;

async function initDb() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }
  db.run(`CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    service TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  saveDb();
}

function saveDb() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

// Get all bookings
app.get('/api/bookings', (req, res) => {
  const bookings = db.exec('SELECT * FROM bookings ORDER BY created_at DESC');
  const rows = bookings.length > 0 ? bookings[0].values : [];
  const cols = ['id', 'name', 'phone', 'email', 'date', 'time', 'service', 'description', 'status', 'created_at'];
  res.json(rows.map(r => Object.fromEntries(cols.map((c, i) => [c, r[i]]))));
});

// Create a booking
app.post('/api/bookings', (req, res) => {
  const { name, phone, email, date, time, service, description } = req.body;
  if (!name || !phone || !date || !time || !service) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  db.run(
    'INSERT INTO bookings (name, phone, email, date, time, service, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [name, phone, email || null, date, time, service, description || null]
  );
  saveDb();
  sendNotification({ name, phone, email, date, time, service, description });
  res.json({ success: true, message: 'Booking created!' });
});

// Delete a booking
app.delete('/api/bookings/:id', (req, res) => {
  db.run('DELETE FROM bookings WHERE id = ?', [req.params.id]);
  saveDb();
  res.json({ success: true });
});

// Get available time slots for a date
app.get('/api/slots', (req, res) => {
  const date = req.query.date;
  if (!date) return res.status(400).json({ error: 'Date required' });
  
  const allSlots = [];
  for (let h = 9; h <= 18; h++) {
    allSlots.push(`${h.toString().padStart(2, '0')}:00`);
    if (h < 18) allSlots.push(`${h.toString().padStart(2, '0')}:30`);
  }
  
  const result = db.exec('SELECT time FROM bookings WHERE date = ? AND status != ?', [date, 'cancelled']);
  const booked = result.length > 0 ? result[0].values.map(r => r[0]) : [];
  
  res.json(allSlots.filter(s => !booked.includes(s)));
});

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
});
