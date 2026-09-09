/* ==========================================================================
   N.F INTERNATIONAL - EXPRESS REST API & SERVER
   ========================================================================== */

const express = require('express');
const cors    = require('cors');
const path    = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
const bcrypt  = require('bcryptjs');
const db      = require('./database');

const app  = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '..')));

// ─── 1. AUTHENTICATION API ───────────────────────────────────────────────────
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const admin = await db.getAdminByUsername(username);
  if (!admin) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  const isValid = bcrypt.compareSync(password, admin.password_hash);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  // Success response
  res.json({
    success: true,
    message: 'Login successful',
    user: { id: admin.id, username: admin.username },
    token: 'nf_token_' + Date.now()
  });
});

// ─── 2. JOBS API ─────────────────────────────────────────────────────────────
// GET all jobs
app.get('/api/jobs', async (req, res) => {
  const jobs = await db.getAllJobs();
  res.json(jobs);
});

// POST new job (Admin)
app.post('/api/jobs', async (req, res) => {
  const { title, category, country } = req.body;
  if (!title || !category || !country) {
    return res.status(400).json({ error: 'Title, category, and country are required.' });
  }

  const newJob = await db.createJob(req.body);
  res.json({ success: true, id: newJob.id, message: 'Job vacancy created successfully.' });
});

// PUT update job (Admin)
app.put('/api/jobs/:id', async (req, res) => {
  const updated = await db.updateJob(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Job vacancy not found.' });
  res.json({ success: true, message: 'Job vacancy updated successfully.' });
});

// DELETE job (Admin)
app.delete('/api/jobs/:id', async (req, res) => {
  const deleted = await db.deleteJob(req.params.id);
  res.json({ success: deleted, message: deleted ? 'Job deleted' : 'Job not found' });
});

// ─── 3. JOB APPLICATIONS API ─────────────────────────────────────────────────
// POST submit application (Candidate)
app.post('/api/apply', async (req, res) => {
  const { applicant_name, applicant_phone } = req.body;
  if (!applicant_name || !applicant_phone) {
    return res.status(400).json({ error: 'Applicant name and phone are required.' });
  }

  const newApp = await db.createApplication(req.body);
  res.json({ success: true, id: newApp.id, message: 'Application submitted successfully.' });
});

// GET all applications (Admin)
app.get('/api/applications', async (req, res) => {
  const apps = await db.getAllApplications();
  res.json(apps);
});

// DELETE application (Admin)
app.delete('/api/applications/:id', async (req, res) => {
  const deleted = await db.deleteApplication(req.params.id);
  res.json({ success: deleted });
});

// ─── 4. CONTACT INQUIRIES API ────────────────────────────────────────────────
// POST submit contact form (Public)
app.post('/api/contact', async (req, res) => {
  const { name, phone, message } = req.body;
  if (!name || !phone || !message) {
    return res.status(400).json({ error: 'Name, phone, and message are required.' });
  }

  const newInquiry = await db.createInquiry(req.body);
  res.json({ success: true, id: newInquiry.id, message: 'Inquiry sent successfully.' });
});

// GET all contact messages (Admin)
app.get('/api/contact', async (req, res) => {
  const msgs = await db.getAllInquiries();
  res.json(msgs);
});

// DELETE contact message (Admin)
app.delete('/api/contact/:id', async (req, res) => {
  const deleted = await db.deleteInquiry(req.params.id);
  res.json({ success: deleted });
});

// ─── 5. EMPLOYEE MANAGEMENT API ─────────────────────────────────────────────
app.get('/api/employees', async (req, res) => res.json(await db.getAllEmployees()));
app.post('/api/employees', async (req, res) => {
  if (!req.body.name || !req.body.role) return res.status(400).json({ error: 'Employee name and role are required.' });
  const employee = await db.createEmployee(req.body);
  res.status(201).json({ success: true, id: employee._id, message: 'Employee added successfully.' });
});
app.delete('/api/employees/:id', async (req, res) => {
  const deleted = await db.deleteEmployee(req.params.id);
  res.json({ success: deleted, message: deleted ? 'Employee removed' : 'Employee not found' });
});

// Fallback route to serve main site
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Start only when running locally. Netlify imports this Express app from a Function.
if (require.main === module) {
  db.connect().then(() => app.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(`🚀 N.F International Server Running on Port ${PORT}`);
    console.log(`🌐 Public Website: http://localhost:${PORT}`);
    console.log(`🔒 Admin Panel:    http://localhost:${PORT}/admin/login.html`);
    console.log(`==================================================\n`);
  })).catch(err => { console.error('MongoDB connection failed:', err.message); process.exit(1); });
}

module.exports = app;
