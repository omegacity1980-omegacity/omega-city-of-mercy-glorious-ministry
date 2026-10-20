// SUPABASE CONFIGURATION & INITIALIZATION
const SUPABASE_URL = 'https://oakzredwhhnjyvlite.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Hr7ZGgf2UGl6Qkpa2XGgmQ_wVq390td';

if (window.supabase) {
  window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

let currentActiveState = { type: 'guest', view: 'home', user: null };
let userCache = null; // Cache users in memory to prevent repeated network delays

document.addEventListener("DOMContentLoaded", () => {
  initDuesConfig();

  // Fast-track splash screen (reduced from 6s to 1.5s for snappy startup)
  setTimeout(() => {
    const loadingScreen = document.getElementById("loading-screen");
    const appContainer = document.getElementById("app");
    
    if (loadingScreen && appContainer) {
      loadingScreen.style.opacity = "0";
      loadingScreen.style.transition = "opacity 0.3s ease";
      
      setTimeout(() => {
        loadingScreen.classList.add("hidden");
        appContainer.classList.remove("hidden");
        renderAuthSelection();
      }, 300);
    } else {
      renderAuthSelection();
    }
  }, 1500);

  // Global Listener to Close Sidebar when clicking outside
  document.addEventListener("click", (e) => {
    const sidebar = document.getElementById("admin-sidebar");
    [sidebar].forEach(sb => {
      if (sb && sb.classList.contains("open")) {
        const toggleBtn = e.target.closest('.toggle-btn-topleft');
        if (!sb.contains(e.target) && !toggleBtn) {
          sb.classList.remove("open");
          const overlay = document.getElementById("sidebar-backdrop");
          if (overlay) overlay.remove();
        }
      }
    });
  });
});

// Lightweight Caching Database Helper
async function getUsersFromSupabase(forceRefresh = false) {
  if (userCache && !forceRefresh) return userCache;

  if (window.supabaseClient) {
    const { data, error } = await window.supabaseClient.from('users').select('*');
    if (!error && data) {
      userCache = data;
      return data;
    }
  }
  return JSON.parse(localStorage.getItem("omega_users")) || [];
}

function getUsers() {
  return userCache || JSON.parse(localStorage.getItem("omega_users")) || [];
}

function saveUsers(users) {
  userCache = users;
  localStorage.setItem("omega_users", JSON.stringify(users));
}

function getFinancialRecords(key) {
  return JSON.parse(localStorage.getItem(key)) || [];
}

function saveFinancialRecords(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function getDuesRates() {
  return JSON.parse(localStorage.getItem("omega_dues_rates")) || [
    { effectiveFrom: "2026-01", rate: 1000, admin: "System", dateSet: new Date().toISOString() }
  ];
}

function saveDuesRates(rates) {
  localStorage.setItem("omega_dues_rates", JSON.stringify(rates));
}

function initDuesConfig() {
  if (!localStorage.getItem("omega_dues_rates")) {
    saveDuesRates([
      { effectiveFrom: "2026-01", rate: 1000, admin: "System", dateSet: new Date().toISOString() }
    ]);
  }
}

// Financial Calculations
function getRateForMonth(year, monthIndex) {
  const monthStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
  const rates = getDuesRates();
  let currentRate = rates[0].rate;
  for (let r of rates) {
    if (r.effectiveFrom <= monthStr) currentRate = r.rate;
    else break;
  }
  return currentRate;
}

function calculateMemberDues(phone) {
  const payments = getFinancialRecords("omega_dues_payments").filter(p => p.memberPhone === phone);
  let totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  let monthLedger = [];
  let remainingPool = totalPaid;
  let totalRequiredTillDate = 0;

  for (let y = 2026; y <= currentYear; y++) {
    let endMonth = (y === currentYear) ? currentMonth : 11;
    for (let m = 0; m <= endMonth; m++) {
      let required = getRateForMonth(y, m);
      let monthName = new Date(y, m, 1).toLocaleString('default', { month: 'short' });
      totalRequiredTillDate += required;
      
      let paidAmt = 0;
      let status = 'unpaid';
      if (remainingPool >= required) {
        paidAmt = required;
        status = 'paid';
        remainingPool -= required;
      } else if (remainingPool > 0) {
        paidAmt = remainingPool;
        status = 'partial';
        remainingPool = 0;
      }
      monthLedger.push({ label: `${monthName} ${y}`, required, paid: paidAmt, status });
    }
  }

  return {
    totalPaid,
    amountOwing: Math.max(0, totalRequiredTillDate - totalPaid),
    advanceDues: remainingPool,
    duesRating: totalRequiredTillDate > 0 ? Math.round((totalPaid / totalRequiredTillDate) * 100) : 100,
    ledger: monthLedger
  };
}

function calculateMemberProjects(phone) {
  const projects = getFinancialRecords("omega_projects").filter(p => p.memberPhone === phone || p.member_phone === phone);
  return {
    total: projects.reduce((sum, p) => sum + Number(p.amount), 0),
    list: projects
  };
}

async function calculateGroupFinancials(groupKey) {
  const users = await getUsersFromSupabase();
  const groupMembers = groupKey === "workforce" 
    ? users.filter(u => u.is_worker || u.isWorker) 
    : users.filter(u => u.group && u.group.toLowerCase() === groupKey.toLowerCase());

  const duesPayments = getFinancialRecords("omega_dues_payments");
  const duesPaid = duesPayments
    .filter(p => groupMembers.some(m => m.phone === p.memberPhone))
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const projects = getFinancialRecords("omega_projects");
  const levyPaid = projects
    .filter(p => groupMembers.some(m => m.phone === p.memberPhone || m.phone === p.member_phone))
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const expenses = getFinancialRecords("omega_group_expenses")
    .filter(e => e.group && e.group.toLowerCase() === groupKey.toLowerCase())
    .reduce((sum, e) => sum + Number(e.amount), 0);

  let duesArrears = 0;
  groupMembers.forEach(m => {
    duesArrears += calculateMemberDues(m.phone).amountOwing;
  });

  return {
    inflow: duesPaid + levyPaid,
    duesPaid,
    levyPaid,
    duesArrears,
    expenses,
    totalBalance: (duesPaid + levyPaid) - expenses,
    members: groupMembers
  };
}

// UI Rendering Functions (Instant Response)
function renderAuthSelection() {
  currentActiveState = { type: 'guest', view: 'home', user: null };
  document.getElementById("view-container").innerHTML = `
    <div class="auth-box">
      <div class="brand-header">
        <h2>OMEGA CITY OF MERCY</h2>
        <p>Keeping financial records transparent.</p>
      </div>
      <div class="auth-buttons">
        <button onclick="renderLogin()" class="btn-primary">Member Login</button>
        <button onclick="renderRegistrationStep1()" class="btn-secondary">Register New Account</button>
        <button onclick="renderAdminLogin()" class="btn-admin-link">Main Admin Login</button>
      </div>
    </div>
  `;
}

function renderLogin() {
  document.getElementById("view-container").innerHTML = `
    <div class="auth-box">
      <h2>Member Login</h2>
      <form onsubmit="handleLogin(event)">
        <div class="input-group">
          <label>Phone Number</label>
          <input type="tel" id="login-phone" required placeholder="Enter phone number" />
        </div>
        <div class="input-group">
          <label>4-Digit PIN</label>
          <input type="password" id="login-pin" maxlength="4" required placeholder="****" />
        </div>
        <button type="submit" class="btn-primary">Login to Dashboard</button>
        <button type="button" onclick="renderAuthSelection()" class="btn-text">Back</button>
      </form>
    </div>
  `;
}

async function handleLogin(e) {
  e.preventDefault();
  const phone = document.getElementById("login-phone").value.trim();
  const pin = document.getElementById("login-pin").value.trim();

  const users = await getUsersFromSupabase();
  const user = users.find(u => u.phone === phone && u.pin === pin);

  if (!user) {
    alert("Invalid phone number or 4-digit PIN!");
    return;
  }

  routeUserDashboard(user, 'home');
}

// Registration Funnel
function renderRegistrationStep1() {
  document.getElementById("view-container").innerHTML = `
    <div class="auth-box">
      <h2>Member Registration (1/3)</h2>
      <form onsubmit="handleRegStep1(event)">
        <input type="text" id="reg-name" placeholder="Full Name" required />
        <input type="tel" id="reg-phone" placeholder="Phone Number" required />
        <input type="tel" id="reg-whatsapp" placeholder="WhatsApp Number" required />
        <input type="email" id="reg-email" placeholder="Email Address" required />
        <label>Date of Birth</label>
        <input type="date" id="reg-dob" required />
        <input type="text" id="reg-origin" placeholder="State of Origin" required />
        <input type="text" id="reg-residence" placeholder="State of Residence" required />
        <input type="text" id="reg-address" placeholder="Residence Address" required />
        <button type="submit" class="btn-primary">Continue</button>
        <button type="button" onclick="renderAuthSelection()" class="btn-text">Cancel</button>
      </form>
    </div>
  `;
}

let tempRegData = {};
async function handleRegStep1(e) {
  e.preventDefault();
  tempRegData = {
    full_name: document.getElementById("reg-name").value.trim(),
    phone: document.getElementById("reg-phone").value.trim(),
    whatsapp: document.getElementById("reg-whatsapp").value.trim(),
    email: document.getElementById("reg-email").value.trim(),
    dob: document.getElementById("reg-dob").value,
    origin: document.getElementById("reg-origin").value.trim(),
    residence: document.getElementById("reg-residence").value.trim(),
    address: document.getElementById("reg-address").value.trim()
  };

  const users = await getUsersFromSupabase();
  if (users.some(u => u.phone === tempRegData.phone)) {
    alert("This phone number is already registered!");
    return;
  }
  renderRegistrationStep2();
}

function renderRegistrationStep2() {
  document.getElementById("view-container").innerHTML = `
    <div class="auth-box">
      <h2>Member Assignment (2/3)</h2>
      <form onsubmit="handleRegStep2(event)">
        <label>Are you married?</label>
        <select id="reg-married" onchange="toggleGenderPopup()" required>
          <option value="">-- Select Option --</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
        <div id="gender-popup-container" class="hidden">
          <label>Gender</label>
          <select id="reg-gender">
            <option value="">-- Select Gender --</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
        <label>Are you a worker?</label>
        <select id="reg-worker" onchange="toggleDeptPopup()" required>
          <option value="">-- Select Option --</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
        <div id="dept-popup-container" class="hidden">
          <label>Workforce Department</label>
          <select id="reg-dept">
            <option value="">-- Select Department --</option>
            <option value="Sanitation">Sanitation</option>
            <option value="Security">Security</option>
            <option value="Usher">Usher</option>
            <option value="Technical">Tech Dept</option>
            <option value="Children class">Children class</option>
            <option value="Minister">Minister</option>
            <option value="Choir">Choir</option>
          </select>
        </div>
        <button type="submit" class="btn-primary">Continue</button>
      </form>
    </div>
  `;
}

function toggleGenderPopup() {
  const isMarried = document.getElementById("reg-married").value;
  document.getElementById("gender-popup-container").classList.toggle("hidden", isMarried !== "yes");
}

function toggleDeptPopup() {
  const isWorker = document.getElementById("reg-worker").value;
  document.getElementById("dept-popup-container").classList.toggle("hidden", isWorker !== "yes");
}

function handleRegStep2(e) {
  e.preventDefault();
  const isMarried = document.getElementById("reg-married").value;
  const gender = document.getElementById("reg-gender").value;
  const isWorker = document.getElementById("reg-worker").value;
  const department = document.getElementById("reg-dept").value;

  let assignedGroup = isMarried === "no" ? "youth" : (gender === "male" ? "men" : "women");
  tempRegData.is_married = isMarried === "yes";
  tempRegData.gender = gender;
  tempRegData.group = assignedGroup;
  tempRegData.is_worker = isWorker === "yes";
  tempRegData.department = isWorker === "yes" ? department : "";

  renderRegistrationStep3();
}

function renderRegistrationStep3() {
  document.getElementById("view-container").innerHTML = `
    <div class="auth-box">
      <h2>Security & Photo (3/3)</h2>
      <form onsubmit="handleFinalRegistration(event)">
        <label>4-Digit Login PIN</label>
        <input type="password" id="reg-pin" maxlength="4" required placeholder="****" />
        <label>Confirm PIN</label>
        <input type="password" id="reg-pin-confirm" maxlength="4" required placeholder="****" />
        <label>Profile Picture</label>
        <input type="file" id="reg-pic" accept="image/*" required />
        <button type="submit" class="btn-primary">SAVE ACCOUNT</button>
      </form>
    </div>
  `;
}

async function handleFinalRegistration(e) {
  e.preventDefault();
  const pin = document.getElementById("reg-pin").value;
  if (pin !== document.getElementById("reg-pin-confirm").value) {
    alert("PINs do not match!");
    return;
  }

  const fileInput = document.getElementById("reg-pic");
  const processSave = async (base64Pic) => {
    tempRegData.profile_pic = base64Pic;
    tempRegData.pin = pin;

    if (window.supabaseClient) {
      const { error } = await window.supabaseClient.from('users').insert([tempRegData]);
      if (error) {
        alert("Error: " + error.message);
        return;
      }
    }
    const users = getUsers();
    users.push(tempRegData);
    saveUsers(users);
    alert("Registration saved successfully!");
    renderLogin();
  };

  if (fileInput.files[0]) {
    const reader = new FileReader();
    reader.onload = (ev) => processSave(ev.target.result);
    reader.readAsDataURL(fileInput.files[0]);
  } else {
    processSave("");
  }
}

// Fast Member Dashboard
async function routeUserDashboard(user, view = 'home') {
  currentActiveState = { type: 'member', view, user };
  const financials = calculateMemberDues(user.phone);
  const projectsData = calculateMemberProjects(user.phone);

  let mainBody = `
    <div class="welcome-banner">
      <h2>${(user.group || 'MEMBER').toUpperCase()} DASHBOARD</h2>
    </div>
    <div class="member-card-grid">
      <div class="m-card"><h4>Dues Paid</h4><p>₦${financials.totalPaid.toLocaleString()}</p></div>
      <div class="m-card"><h4>Amount Owing</h4><p>₦${financials.amountOwing.toLocaleString()}</p></div>
      <div class="m-card"><h4>Projects</h4><p>₦${projectsData.total.toLocaleString()}</p></div>
    </div>
  `;

  document.getElementById("view-container").innerHTML = `
    <div class="member-dashboard-wrapper">
      <header class="member-topbar">
        <h3>${user.full_name}</h3>
        <button onclick="renderAuthSelection()" class="btn-logout">Logout</button>
      </header>
      <div class="member-content">${mainBody}</div>
    </div>
  `;
}

// Admin Portal Entry
function renderAdminLogin() {
  document.getElementById("view-container").innerHTML = `
    <div class="auth-box">
      <h2>Main Admin Login</h2>
      <form onsubmit="renderAdminDashboard('home'); return false;">
        <input type="tel" required placeholder="Admin Phone" />
        <input type="password" maxlength="8" required placeholder="PIN" />
        <button type="submit" class="btn-primary">Login</button>
        <button type="button" onclick="renderAuthSelection()" class="btn-text">Back</button>
      </form>
    </div>
  `;
}

function toggleSidebar() {
  document.getElementById("admin-sidebar")?.classList.toggle("open");
}

function toggleSubMenu(id) {
  document.getElementById(id)?.classList.toggle("hidden");
}

// Fast Admin Dashboard Renderer
async function renderAdminDashboard(view = "home") {
  currentActiveState = { type: 'admin', view, user: null };
  const users = await getUsersFromSupabase();
  const duesPayments = getFinancialRecords("omega_dues_payments");
  const groupExpenses = getFinancialRecords("omega_group_expenses");
  
  const totalDues = duesPayments.reduce((s, i) => s + Number(i.amount), 0);
  const totalExpenses = groupExpenses.reduce((s, i) => s + Number(i.amount), 0);

  let content = "";

  if (view === "home") {
    content = `
      <section class="cards-container">
        <div class="balance-card-full">
          <h4>TOTAL REGISTERED MEMBERS</h4>
          <p>${users.length}</p>
        </div>
        <div class="admin-cards-grid-2x2">
          <div class="summary-card"><h4>Total Dues</h4><p>₦${totalDues.toLocaleString()}</p></div>
          <div class="summary-card"><h4>Expenses</h4><p>₦${totalExpenses.toLocaleString()}</p></div>
        </div>
      </section>
    `;
  } else if (["men", "women", "youth", "workforce"].includes(view)) {
    const fin = await calculateGroupFinancials(view);
    let rows = fin.members.map((u, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${u.full_name}</td>
        <td>${u.phone}</td>
        <td>${u.department || 'N/A'}</td>
      </tr>
    `).join("");

    content = `
      <div class="admin-content-area">
        <h3>${view.toUpperCase()} FELLOWSHIP</h3>
        <table class="members-table">
          <thead><tr><th>S/N</th><th>Name</th><th>Phone</th><th>Dept</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="4">No members found.</td></tr>'}</tbody>
        </table>
      </div>
    `;
  } else if (view === "all" || view.startsWith("dept-")) {
    let filtered = users;
    if (view.startsWith("dept-")) {
      const deptName = view.replace("dept-", "").toLowerCase();
      filtered = users.filter(u => u.department && u.department.toLowerCase() === deptName);
    }
    let rows = filtered.map((u, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${u.full_name}</td>
        <td>${u.phone}</td>
        <td>${u.group || 'N/A'}</td>
        <td>${u.department || 'No'}</td>
      </tr>
    `).join("");

    content = `
      <div class="admin-content-area">
        <h3>Members Directory (${filtered.length})</h3>
        <table class="members-table">
          <thead><tr><th>S/N</th><th>Name</th><th>Phone</th><th>Group</th><th>Dept</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="5">No records.</td></tr>'}</tbody>
        </table>
      </div>
    `;
  } else if (view === "projects") {
    const projects = getFinancialRecords("omega_projects");
    let rows = projects.map((p, i) => `<tr><td>${i+1}</td><td>${p.date}</td><td>${p.memberName}</td><td>${p.projectName}</td><td>₦${p.amount}</td></tr>`).join("");
    
    let options = users.map(u => `<option value="${u.phone}">${u.full_name} (${u.phone})</option>`).join("");
    content = `
      <div class="admin-content-area">
        <h3>Group Projects</h3>
        <form onsubmit="handleProjectEntry(event)" class="settings-card">
          <select id="proj-member-phone" required><option value="">-- Select Member --</option>${options}</select>
          <input type="text" id="proj-title" placeholder="Project Name" required />
          <input type="number" id="proj-amount" placeholder="Amount" required />
          <input type="date" id="proj-date" required />
          <button type="submit" class="btn-primary">Save Project</button>
        </form>
        <table class="members-table"><thead><tr><th>S/N</th><th>Date</th><th>Member</th><th>Project</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table>
      </div>
    `;
  } else if (view === "settings") {
    content = `<div class="admin-content-area"><h3>Settings</h3><p>System configuration active.</p></div>`;
  }

  document.getElementById("view-container").innerHTML = `
    <div class="admin-wrapper">
      <main class="admin-main">
        <header class="admin-topbar">
          <button class="toggle-btn-topleft" onclick="toggleSidebar()"><i class="fa-solid fa-bars"></i> Menu</button>
          <h3>Admin Portal</h3>
        </header>
        ${content}
      </main>
      <aside class="admin-sidebar" id="admin-sidebar">
        <div class="sidebar-header"><span>NAVIGATION</span><button onclick="toggleSidebar()"><i class="fa-solid fa-xmark"></i></button></div>
        <ul class="sidebar-menu">
          <li><a onclick="renderAdminDashboard('home'); toggleSidebar();">Dashboard</a></li>
          <li><a onclick="renderAdminDashboard('projects'); toggleSidebar();">Group Projects</a></li>
          <li><a onclick="renderAdminDashboard('all'); toggleSidebar();">View All Members</a></li>
          <li><a onclick="renderAuthSelection()">Logout</a></li>
        </ul>
      </aside>
    </div>
  `;
}

async function handleProjectEntry(e) {
  e.preventDefault();
  const phone = document.getElementById("proj-member-phone").value;
  const projectName = document.getElementById("proj-title").value.trim();
  const amount = parseFloat(document.getElementById("proj-amount").value);
  const date = document.getElementById("proj-date").value;

  const users = await getUsersFromSupabase();
  const user = users.find(u => u.phone === phone);
  const memberName = user ? user.full_name : "Unknown";

  if (window.supabaseClient) {
    await window.supabaseClient.from('omega_projects').upsert([{
      member_phone: phone, member_name: memberName, project_name: projectName, amount, date
    }], { onConflict: 'member_phone, project_name' });
  }

  const projects = getFinancialRecords("omega_projects");
  projects.push({ memberPhone: phone, memberName, projectName, amount, date });
  saveFinancialRecords("omega_projects", projects);

  alert("Project saved successfully!");
  renderAdminDashboard("projects");
}
