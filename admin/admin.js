/* ==========================================================================
   N.F INTERNATIONAL - ADMIN PANEL & DATABASE INTEGRATION (REST API)
   ========================================================================== */

const API_BASE    = ''; // Relative API path
const SESSION_KEY = 'nf_admin_session';

// ─── UTILITIES ───────────────────────────────────────────────────────────────
function isLoggedIn() {
  return sessionStorage.getItem(SESSION_KEY) === 'true';
}

function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = 'login.html';
  }
}

function showToast(message, subtitle = '', type = 'gold') {
  const toast = document.getElementById('adminToast');
  if (!toast) return;
  toast.querySelector('.toast-title').textContent = message;
  toast.querySelector('.toast-sub').textContent = subtitle;
  toast.className = `toast toast-${type} show`;
  setTimeout(() => { toast.classList.remove('show'); }, 4000);
}

const CATEGORY_LABEL = {
  construction: 'Construction & Trades',
  healthcare: 'Healthcare & Nursing',
  engineering: 'Engineering & Technical',
  hospitality: 'Hospitality & Catering',
  logistics: 'Drivers & Operators'
};

// ─── LOGIN PAGE LOGIC ────────────────────────────────────────────────────────
function initLoginPage() {
  if (isLoggedIn()) {
    window.location.href = 'index.html';
    return;
  }

  const form  = document.getElementById('loginForm');
  const error = document.getElementById('loginError');

  form?.addEventListener('submit', async e => {
    e.preventDefault();
    const username = document.getElementById('loginUser').value.trim();
    const password = document.getElementById('loginPass').value;
    const submitBtn = form.querySelector('button[type="submit"]');

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...`;

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        sessionStorage.setItem(SESSION_KEY, 'true');
        window.location.href = 'index.html';
      } else {
        error.textContent = data.error || 'Invalid username or password.';
        error.classList.add('show');
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i class="fa-solid fa-arrow-right-to-bracket"></i> Login to Admin Panel`;
        setTimeout(() => error.classList.remove('show'), 4000);
      }
    } catch (err) {
      error.textContent = 'Server connection error. Please try again.';
      error.classList.add('show');
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<i class="fa-solid fa-arrow-right-to-bracket"></i> Login to Admin Panel`;
    }
  });
}

// ─── ADMIN DASHBOARD LOGIC ───────────────────────────────────────────────────
function initDashboard() {
  requireAuth();

  let jobs = [];
  let applications = [];
  let messages = [];
  let employees = [];

  let editingId = null;
  let deleteType = null; // 'job', 'app', 'msg'
  let deleteTargetId = null;
  let searchTerm = '';
  let activeTab = 'jobs';

  const tableBody     = document.getElementById('jobsTableBody');
  const appsBody      = document.getElementById('appsTableBody');
  const msgsBody      = document.getElementById('msgsTableBody');
  const employeesBody = document.getElementById('employeesTableBody');

  const totalJobs     = document.getElementById('statTotalJobs');
  const totalVac      = document.getElementById('statTotalVacancies');
  const totalApps     = document.getElementById('statTotalApps');
  const totalMsgs     = document.getElementById('statTotalMsgs');
  const totalEmployees = document.getElementById('statTotalEmployees');
  const totalCategories = document.getElementById('statTotalCategories');

  const addBtn        = document.getElementById('addJobBtn');
  const jobModal      = document.getElementById('jobModal');
  const employeeModal = document.getElementById('employeeModal');
  const deleteModal   = document.getElementById('deleteModal');
  const jobForm       = document.getElementById('jobForm');
  const employeeForm  = document.getElementById('employeeForm');
  const addEmployeeBtn = document.getElementById('addEmployeeBtn');
  const searchInput   = document.getElementById('searchInput');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebar        = document.querySelector('.admin-sidebar');
  const logoutBtn      = document.getElementById('logoutBtn');
  const confirmDelete  = document.getElementById('confirmDelete');

  // Mobile Sidebar Toggle
  sidebarToggle?.addEventListener('click', () => sidebar?.classList.toggle('open'));

  // Logout
  logoutBtn?.addEventListener('click', () => {
    sessionStorage.removeItem(SESSION_KEY);
    window.location.href = 'login.html';
  });

  // Tab Navigation
  document.querySelectorAll('[data-tab]').forEach(tab => {
    tab.addEventListener('click', e => {
      e.preventDefault();
      document.querySelectorAll('[data-tab]').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeTab = tab.getAttribute('data-tab');

      document.querySelectorAll('.tab-view').forEach(view => view.style.display = 'none');
      document.getElementById(`view-${activeTab}`).style.display = 'block';
    });
  });

  // Search Input
  searchInput?.addEventListener('input', e => {
    searchTerm = e.target.value.toLowerCase();
    renderJobsTable();
  });

  // Add Job Trigger
  addBtn?.addEventListener('click', () => {
    editingId = null;
    jobForm?.reset();
    document.getElementById('modalTitle').textContent = '➕ Add New Vacancy';
    document.getElementById('saveJobBtn').innerHTML = '<i class="fa-solid fa-check"></i> Save Vacancy';
    openModal(jobModal);
  });

  function showEmployeeModal() { employeeForm?.reset(); openModal(employeeModal); }
  addEmployeeBtn?.addEventListener('click', showEmployeeModal);
  document.getElementById('addEmployeeNav')?.addEventListener('click', e => { e.preventDefault(); showEmployeeModal(); });

  // Close Modals
  document.querySelectorAll('.modal-close, [data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      closeModal(jobModal);
      closeModal(employeeModal);
      closeModal(deleteModal);
    });
  });

  // ─── API CALLS ─────────────────────────────────────────────────────────────
  async function fetchJobs() {
    try {
      const res = await fetch('/api/jobs');
      jobs = await res.json();
      renderStats();
      renderJobsTable();
    } catch (err) {
      console.error('Error fetching jobs:', err);
    }
  }

  async function fetchApplications() {
    try {
      const res = await fetch('/api/applications');
      applications = await res.json();
      renderStats();
      renderApplicationsTable();
    } catch (err) {
      console.error('Error fetching applications:', err);
    }
  }

  async function fetchMessages() {
    try {
      const res = await fetch('/api/contact');
      messages = await res.json();
      renderStats();
      renderMessagesTable();
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  }

  async function fetchEmployees() {
    try {
      const res = await fetch('/api/employees');
      employees = await res.json();
      renderStats();
      renderEmployeesTable();
    } catch (err) { console.error('Error fetching employees:', err); }
  }

  // Save Job (Create / Update)
  jobForm?.addEventListener('submit', async e => {
    e.preventDefault();
    const payload = {
      title:     document.getElementById('fTitle').value.trim(),
      category:  document.getElementById('fCategory').value,
      country:   document.getElementById('fCountry').value.trim(),
      city:      document.getElementById('fCity').value.trim(),
      contract:  document.getElementById('fContract').value.trim(),
      benefits:  document.getElementById('fBenefits').value.trim(),
      salary:    document.getElementById('fSalary').value.trim(),
      vacancies: parseInt(document.getElementById('fVacancies').value) || 1,
      active:    1
    };

    try {
      let res;
      if (editingId !== null) {
        res = await fetch(`/api/jobs/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        showToast('Vacancy Updated!', payload.title, 'success');
      } else {
        res = await fetch('/api/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        showToast('Vacancy Created!', payload.title, 'success');
      }

      closeModal(jobModal);
      fetchJobs();
    } catch (err) {
      showToast('Error', 'Failed to save vacancy to database.', 'danger');
    }
  });

  employeeForm?.addEventListener('submit', async e => {
    e.preventDefault();
    const submitBtn = employeeForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    try {
      const res = await fetch('/api/employees', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: document.getElementById('employeeName').value.trim(), role: document.getElementById('employeeRole').value.trim(), phone: document.getElementById('employeePhone').value.trim(), email: document.getElementById('employeeEmail').value.trim() }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not add employee.');
      closeModal(employeeModal);
      showToast('Employee Added!', 'The team list has been updated.', 'success');
      fetchEmployees();
    } catch (err) { showToast('Error', err.message, 'danger'); }
    finally { submitBtn.disabled = false; }
  });

  // Confirm Delete
  confirmDelete?.addEventListener('click', async () => {
    try {
      if (deleteType === 'job') {
        await fetch(`/api/jobs/${deleteTargetId}`, { method: 'DELETE' });
        showToast('Vacancy Deleted', '', 'danger');
        fetchJobs();
      } else if (deleteType === 'app') {
        await fetch(`/api/applications/${deleteTargetId}`, { method: 'DELETE' });
        showToast('Application Deleted', '', 'danger');
        fetchApplications();
      } else if (deleteType === 'msg') {
        await fetch(`/api/contact/${deleteTargetId}`, { method: 'DELETE' });
        showToast('Message Deleted', '', 'danger');
        fetchMessages();
      } else if (deleteType === 'employee') {
        await fetch(`/api/employees/${deleteTargetId}`, { method: 'DELETE' });
        showToast('Employee Removed', '', 'danger');
        fetchEmployees();
      }
      closeModal(deleteModal);
    } catch (err) {
      showToast('Error', 'Failed to delete record.', 'danger');
    }
  });

  // ─── RENDERERS ─────────────────────────────────────────────────────────────
  function renderStats() {
    if (totalJobs) totalJobs.textContent = jobs.length;
    if (totalVac)  totalVac.textContent  = jobs.reduce((s, j) => s + (j.vacancies || 0), 0);
    if (totalApps) totalApps.textContent = applications.length;
    if (totalMsgs) totalMsgs.textContent = messages.length;
    if (totalEmployees) totalEmployees.textContent = employees.length;
    if (totalCategories) totalCategories.textContent = new Set(jobs.map(j => j.category)).size;
  }

  function renderJobsTable() {
    if (!tableBody) return;
    const filtered = jobs.filter(j =>
      j.title.toLowerCase().includes(searchTerm) ||
      j.country.toLowerCase().includes(searchTerm) ||
      j.category.toLowerCase().includes(searchTerm)
    );

    if (filtered.length === 0) {
      tableBody.innerHTML = `
        <tr><td colspan="7" class="empty-state">
          <i class="fa-solid fa-briefcase"></i>
          <p>No vacancies found in database.</p>
        </td></tr>`;
      return;
    }

    tableBody.innerHTML = filtered.map(j => `
      <tr>
        <td class="td-title">${j.title}</td>
        <td><span class="td-badge badge-${j.category}">${CATEGORY_LABEL[j.category] || j.category}</span></td>
        <td>${j.city ? j.city + ', ' : ''}${j.country}</td>
        <td>${j.salary}</td>
        <td><span style="color:#22C55E; font-weight:700;">${j.vacancies}</span></td>
        <td>${j.contract}</td>
        <td class="td-actions">
          <button class="btn btn-warning btn-sm" onclick="openEditJob('${j._id}')"><i class="fa-solid fa-pen"></i> Edit</button>
          <button class="btn btn-danger btn-sm" onclick="openDeleteRecord('job', '${j._id}', '${j.title.replace(/'/g, "\\'")}')"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>
    `).join('');
  }

  function renderApplicationsTable() {
    if (!appsBody) return;
    if (applications.length === 0) {
      appsBody.innerHTML = `<tr><td colspan="6" class="empty-state"><i class="fa-solid fa-id-card"></i><p>No candidate applications submitted yet.</p></td></tr>`;
      return;
    }

    appsBody.innerHTML = applications.map(a => `
      <tr>
        <td><strong>${a.applicant_name}</strong></td>
        <td><a href="tel:${a.applicant_phone}" style="color:var(--gold-primary); font-weight:600;"><i class="fa-solid fa-phone"></i> ${a.applicant_phone}</a></td>
        <td><span class="td-badge" style="background:rgba(201,162,39,0.15); color:var(--gold-light);">${a.job_title}</span></td>
        <td>${a.passport_status}</td>
        <td>${a.experience}</td>
        <td><button class="btn btn-danger btn-sm" onclick="openDeleteRecord('app', '${a._id}', '${a.applicant_name}')"><i class="fa-solid fa-trash"></i> Delete</button></td>
      </tr>
    `).join('');
  }

  function renderMessagesTable() {
    if (!msgsBody) return;
    if (messages.length === 0) {
      msgsBody.innerHTML = `<tr><td colspan="5" class="empty-state"><i class="fa-solid fa-envelope-open"></i><p>No contact messages received yet.</p></td></tr>`;
      return;
    }

    msgsBody.innerHTML = messages.map(m => `
      <tr>
        <td><strong>${m.name}</strong></td>
        <td><a href="tel:${m.phone}" style="color:var(--gold-primary); font-weight:600;"><i class="fa-solid fa-phone"></i> ${m.phone}</a><br><small style="color:var(--text-muted);">${m.email}</small></td>
        <td style="max-width:300px; white-space:pre-wrap;">${m.message}</td>
        <td><small style="color:var(--text-muted);">${new Date(m.submitted_at).toLocaleDateString()}</small></td>
        <td><button class="btn btn-danger btn-sm" onclick="openDeleteRecord('msg', '${m._id}', '${m.name}')"><i class="fa-solid fa-trash"></i> Delete</button></td>
      </tr>
    `).join('');
  }

  function renderEmployeesTable() {
    if (!employeesBody) return;
    if (employees.length === 0) {
      employeesBody.innerHTML = `<tr><td colspan="6" class="empty-state"><i class="fa-solid fa-user-tie"></i><p>No employees have been added yet.</p></td></tr>`;
      return;
    }
    employeesBody.innerHTML = employees.map(employee => `
      <tr><td><strong>${employee.name}</strong></td><td>${employee.role}</td><td>${employee.phone || '—'}</td><td>${employee.email || '—'}</td><td><span class="td-badge" style="background:rgba(34,197,94,.15); color:#22c55e;">${employee.status}</span></td><td><button class="btn btn-danger btn-sm" onclick="openDeleteRecord('employee', '${employee._id}', '${employee.name.replace(/'/g, "\\'")}')"><i class="fa-solid fa-trash"></i> Remove</button></td></tr>
    `).join('');
  }

  // ─── EXPOSE GLOBALS ─────────────────────────────────────────────────
  window.openEditJob = function(id) {
    const job = jobs.find(j => String(j._id) === String(id));
    if (!job) return;

    editingId = id;
    document.getElementById('fTitle').value     = job.title;
    document.getElementById('fCategory').value  = job.category;
    document.getElementById('fCountry').value   = job.country;
    document.getElementById('fCity').value      = job.city || '';
    document.getElementById('fContract').value  = job.contract;
    document.getElementById('fBenefits').value  = job.benefits;
    document.getElementById('fSalary').value    = job.salary;
    document.getElementById('fVacancies').value = job.vacancies;

    document.getElementById('modalTitle').textContent = '✏️ Edit Vacancy';
    document.getElementById('saveJobBtn').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Update Vacancy';
    openModal(jobModal);
  };

  window.openDeleteRecord = function(type, id, name) {
    deleteType = type;
    deleteTargetId = id;
    const label = document.getElementById('deleteJobName');
    if (label) label.textContent = `"${name}"`;
    openModal(deleteModal);
  };

  // Initial Fetch
  fetchJobs();
  fetchApplications();
  fetchMessages();
  fetchEmployees();
  // Keep all dashboard cards and tables current without a manual reload.
  setInterval(() => { fetchJobs(); fetchApplications(); fetchMessages(); fetchEmployees(); }, 5000);
}

function openModal(el)  { el?.classList.add('active'); document.body.style.overflow = 'hidden'; }
function closeModal(el) { el?.classList.remove('active'); document.body.style.overflow = ''; }

// ─── PUBLIC SITE DATA RENDERER ───────────────────────────────────────────────
async function renderPublicJobs() {
  const grid = document.getElementById('jobsGrid');
  if (!grid) return;

  try {
    const res = await fetch('/api/jobs');
    const jobs = await res.json();

    if (!jobs || jobs.filter(j => j.active).length === 0) {
      grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; color:var(--text-muted); padding: 3rem 0;">
        <i class="fa-solid fa-briefcase" style="font-size:2.5rem; color: var(--gold-primary); margin-bottom: 1rem; display:block;"></i>
        <p>No vacancies available at the moment. Please check back soon.</p>
      </div>`;
      return;
    }

    grid.innerHTML = jobs.filter(j => j.active).map(j => `
      <div class="job-card" data-category="${j.category}">
        <div class="job-header">
          <span class="job-category-badge">${CATEGORY_LABEL[j.category] || j.category}</span>
          <span class="job-vacancies"><i class="fa-solid fa-users"></i> ${j.vacancies} Vacancies</span>
        </div>
        <h3 class="job-title">${j.title}</h3>
        <ul class="job-details-list">
          <li><i class="fa-solid fa-earth-americas"></i> <strong>Location:</strong> ${j.city ? j.city + ', ' : ''}${j.country}</li>
          <li><i class="fa-solid fa-clock"></i> <strong>Contract:</strong> ${j.contract}</li>
          <li><i class="fa-solid fa-star"></i> <strong>Benefits:</strong> ${j.benefits}</li>
        </ul>
        <div class="job-card-footer">
          <span class="job-salary">${j.salary} / Month</span>
          <button class="btn btn-outline-gold btn-apply-modal">Apply Now</button>
        </div>
      </div>
    `).join('');

    // Attach Filter Listeners
    const filterBtns = document.querySelectorAll('.filter-btn');
    const jobCards = document.querySelectorAll('.job-card');

    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const filterValue = btn.getAttribute('data-filter');
        jobCards.forEach(card => {
          const category = card.getAttribute('data-category');
          if (filterValue === 'all' || category === filterValue) {
            card.style.display = 'flex';
            card.style.opacity = '1';
          } else {
            card.style.display = 'none';
          }
        });
      });
    });

    // Attach Apply Modal Listener
    document.querySelectorAll('.btn-apply-modal').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        const card = btn.closest('.job-card');
        const jobTitle = card ? card.querySelector('.job-title')?.textContent : '';
        const mi = document.getElementById('modalJobTitle');
        if (mi) mi.value = jobTitle || 'General Overseas Application';
        const modal = document.getElementById('applyModal');
        modal?.classList.add('active');
        document.body.style.overflow = 'hidden';
      });
    });
  } catch (err) {
    console.error('Failed to load public jobs from DB API:', err);
  }
}

// Public listings are refreshed too, so newly created vacancies appear without a page reload.
if (document.getElementById('jobsGrid')) setInterval(renderPublicJobs, 5000);
