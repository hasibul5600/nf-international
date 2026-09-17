/* ==========================================================================
   N.F INTERNATIONAL - EXPRESS REST API & SERVER (TYPESCRIPT)
   ========================================================================== */

import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import db from './database';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env'), quiet: true });
dotenv.config({ path: path.resolve(__dirname, '../.env'), quiet: true });
dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

const app = express();
const PORT = process.env.PORT || 5000;

// Resolve project root directory for static file serving
const rootDir = fs.existsSync(path.join(__dirname, '..', 'index.html'))
  ? path.join(__dirname, '..')
  : fs.existsSync(path.join(process.cwd(), 'index.html'))
    ? process.cwd()
    : path.join(__dirname, '..', '..');

// Helper to reliably extract route parameter strings
const getParam = (param: string | string[] | undefined): string => {
  if (Array.isArray(param)) return param[0] || '';
  return param || '';
};

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(rootDir));


// ─── 1. AUTHENTICATION API ───────────────────────────────────────────────────
app.post('/api/login', async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required.' });
    return;
  }

  const admin = await db.getAdminByUsername(username);
  if (!admin) {
    res.status(401).json({ error: 'Invalid username or password.' });
    return;
  }

  const isValid = bcrypt.compareSync(password, admin.password_hash);
  if (!isValid) {
    res.status(401).json({ error: 'Invalid username or password.' });
    return;
  }

  // Success response
  res.json({
    success: true,
    message: 'Login successful',
    user: { id: (admin as { _id?: unknown })._id, username: admin.username },
    token: 'nf_token_' + Date.now()
  });
});

// ─── 2. JOBS API ─────────────────────────────────────────────────────────────
// GET all jobs
app.get('/api/jobs', async (_req: Request, res: Response): Promise<void> => {
  const jobs = await db.getAllJobs();
  res.json(jobs);
});

// POST new job (Admin)
app.post('/api/jobs', async (req: Request, res: Response): Promise<void> => {
  const { title, category, country } = req.body;
  if (!title || !category || !country) {
    res.status(400).json({ error: 'Title, category, and country are required.' });
    return;
  }

  const newJob = await db.createJob(req.body);
  res.json({ success: true, id: newJob._id, message: 'Job vacancy created successfully.' });
});

// PUT update job (Admin)
app.put('/api/jobs/:id', async (req: Request, res: Response): Promise<void> => {
  const id = getParam(req.params.id);
  const updated = await db.updateJob(id, req.body);
  if (!updated) {
    res.status(404).json({ error: 'Job vacancy not found.' });
    return;
  }
  res.json({ success: true, message: 'Job vacancy updated successfully.' });
});

// DELETE job (Admin)
app.delete('/api/jobs/:id', async (req: Request, res: Response): Promise<void> => {
  const id = getParam(req.params.id);
  const deleted = await db.deleteJob(id);
  res.json({ success: deleted, message: deleted ? 'Job deleted' : 'Job not found' });
});

// ─── 3. JOB APPLICATIONS API ─────────────────────────────────────────────────
// POST submit application (Candidate)
app.post('/api/apply', async (req: Request, res: Response): Promise<void> => {
  const applicant_name = (req.body.applicant_name || req.body.name || '').toString().trim();
  const applicant_phone = (req.body.applicant_phone || req.body.phone || '').toString().trim();

  if (!applicant_name || !applicant_phone) {
    res.status(400).json({ error: 'Applicant name and phone are required.' });
    return;
  }

  const newApp = await db.createApplication({
    ...req.body,
    applicant_name,
    applicant_phone
  });
  res.json({ success: true, id: newApp._id, message: 'Application submitted successfully.' });
});


// GET all applications (Admin)
app.get('/api/applications', async (_req: Request, res: Response): Promise<void> => {
  const apps = await db.getAllApplications();
  res.json(apps);
});

// DELETE application (Admin)
app.delete('/api/applications/:id', async (req: Request, res: Response): Promise<void> => {
  const id = getParam(req.params.id);
  const deleted = await db.deleteApplication(id);
  res.json({ success: deleted });
});

// ─── 4. CONTACT INQUIRIES API ────────────────────────────────────────────────
// POST submit contact form (Public)
app.post('/api/contact', async (req: Request, res: Response): Promise<void> => {
  const name = (req.body.name || req.body.applicant_name || '').toString().trim();
  const phone = (req.body.phone || req.body.applicant_phone || '').toString().trim();
  const message = (req.body.message || '').toString().trim();

  if (!name || !phone || !message) {
    res.status(400).json({ error: 'Name, phone, and message are required.' });
    return;
  }

  const newInquiry = await db.createInquiry({
    ...req.body,
    name,
    phone,
    message
  });
  res.json({ success: true, id: newInquiry._id, message: 'Inquiry sent successfully.' });
});

// GET all contact messages (Admin)
app.get('/api/contact', async (_req: Request, res: Response): Promise<void> => {
  const msgs = await db.getAllInquiries();
  res.json(msgs);
});

// DELETE contact message (Admin)
app.delete('/api/contact/:id', async (req: Request, res: Response): Promise<void> => {
  const id = getParam(req.params.id);
  const deleted = await db.deleteInquiry(id);
  res.json({ success: deleted });
});

// ─── 5. EMPLOYEE MANAGEMENT API ─────────────────────────────────────────────
app.get('/api/employees', async (_req: Request, res: Response): Promise<void> => {
  res.json(await db.getAllEmployees());
});

app.post('/api/employees', async (req: Request, res: Response): Promise<void> => {
  if (!req.body.name || !req.body.role) {
    res.status(400).json({ error: 'Employee name and role are required.' });
    return;
  }
  const employee = await db.createEmployee(req.body);
  res.status(201).json({ success: true, id: employee._id, message: 'Employee added successfully.' });
});

app.delete('/api/employees/:id', async (req: Request, res: Response): Promise<void> => {
  const id = getParam(req.params.id);
  const deleted = await db.deleteEmployee(id);
  res.json({ success: deleted, message: deleted ? 'Employee removed' : 'Employee not found' });
});

// Fallback route to serve main site
app.use((_req: Request, res: Response): void => {
  res.sendFile(path.join(rootDir, 'index.html'));
});


// Start only when running locally. Netlify imports this Express app from a Function.
if (require.main === module) {
  db.connect().then(() => {
    app.listen(PORT, () => {
      console.log(`\n==================================================`);
      console.log(`🚀 N.F International Server Running on Port ${PORT}`);
      console.log(`🌐 Public Website: http://localhost:${PORT}`);
      console.log(`🔒 Admin Panel:    http://localhost:${PORT}/admin/login.html`);
      console.log(`==================================================\n`);
    });
  }).catch((err: Error) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });
}

export default app;
module.exports = app;
