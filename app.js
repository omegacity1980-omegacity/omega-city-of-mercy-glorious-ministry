// SUPABASE CONFIGURATION & INITIALIZATION
const SUPABASE_URL = 'https://oakzredwhhnjyvlite.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Hr7ZGgf2UGl6Qkpa2XGgmQ_wVq390td';

if (window.supabase) {
  window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

let currentActiveState = { type: 'guest', view: 'home', user: null };

document.addEventListener("DOMContentLoaded", () => {
  initDuesConfig();

  // Splash / Loading Screen Timer
  setTimeout(() => {
    const loadingScreen = document.getElementById("loading-screen");
    const appContainer = document.getElementById("app");
    
    if (loadingScreen && appContainer) {
      loadingScreen.style.opacity = "0";
      loadingScreen.style.transition = "opacity 0.5s ease";
      
      setTimeout(() => {
        loadingScreen.classList.add("hidden");
        appContainer.classList.remove("hidden");
        renderAuthSelection();
      }, 500);
    } else {
      renderAuthSelection();
    }
  }, 2000);

  // Global Listener to Close Sidebar when clicking outside
  document.addEventListener("click", (e) => {
    const sidebar = document.getElementById("admin-sidebar");
    const memberSidebar = document.getElementById("member-sidebar");

    [sidebar, memberSidebar].forEach(sb => {
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

// Database Helpers (Async Supabase Integration)
async function getUsers() {
  if (window.supabaseClient) {
    const { data, error } = await window.supabaseClient.from('users').select('*');
    if (!error && data) {
      return data.map(u => ({
        fullName: u.full_name,
        phone: u.phone,
        whatsapp: u.whatsapp,
        email: u.email,
        dob: u.dob,
        origin: u.origin,
        residence: u.residence,
        address: u.address,
        isMarried: u.is_married,
        gender: u.gender,
        group: u.group,
        isWorker: u.is_worker,
        department: u.department,
        pin: u.pin,
        profilePic: u.profile_pic,
        isGroupLeader: u.is_group_leader,
        excoRole: u.exco_role
      }));
    }
  }
  return JSON.parse(localStorage.getItem("omega_users")) || [];
}

async function saveUserToSupabase(userData) {
  if (window.supabaseClient) {
    const payload = {
      full_name: userData.fullName,
      phone: userData.phone,
      whatsapp: userData.whatsapp,
      email: userData.email,
      dob: userData.dob,
      origin: userData.origin,
      residence: userData.residence,
      address: userData.address,
      is_married: userData.isMarried,
      gender: userData.gender,
      group: userData.group,
      is_worker: userData.isWorker,
      department: userData.department,
      pin: userData.pin,
      profile_pic: userData.profilePic,
      is_group_leader: userData.isGroupLeader || false,
      exco_role: userData.excoRole || null
    };

    const { error } = await window.supabaseClient.from('users').insert([payload]);
    if (error) {
      console.error("Supabase Save Error:", error);
      alert("Database error: " + error.message);
      return false;
    }
  }
  
  const localUsers = JSON.parse(localStorage.getItem("omega_users")) || [];
  localUsers.push(userData);
  localStorage.setItem("omega_users", JSON.stringify(localUsers));
  return true;
}

function getFinancialRecords(key) {
  return JSON.parse(localStorage.getItem(key)) || [];
}

function saveFinancialRecords(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function getDuesRates() {
  return JSON.parse(localStorage.getItem("omega_dues_rates")) || [
    { effectiveFrom: "2026-01", rate: 500, admin: "System", dateSet: new Date().toISOString() }
  ];
}

function saveDuesRates(rates) {
  localStorage.setItem("omega_dues_rates", JSON.stringify(rates));
}

function initDuesConfig() {
  if (!localStorage.getItem("omega_dues_rates")) {
    saveDuesRates([
      { effectiveFrom: "2026-01", rate: 500, admin: "System", dateSet: new Date().toISOString() }
    ]);
  }
}

// Financial Ledger Calculations
function getRateForMonth(year, monthIndex) {
  const monthStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
  const rates = getDuesRates().sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
  
  let currentRate = rates[0].rate;
  for (let r of rates) {
    if (r.effectiveFrom <= monthStr) {
      currentRate = r.rate;
    } else {
      break;
    }
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
  let startYear = 2026;

  for (let y = startYear; y <= currentYear; y++) {
    let endMonth = (y === currentYear) ? currentMonth : 11;
    for (let m = 0; m <= endMonth; m++) {
      let required = getRateForMonth(y, m);
      let monthName = new Date(y, m, 1).toLocaleString('default', { month: 'short' });
      monthLedger.push({
        year: y,
        month: m,
        label: `${monthName} ${y}`,
        required: required,
        paid: 0,
        status: 'unpaid'
      });
    }
  }

  let remainingPool = totalPaid;
  let totalRequiredTillDate = 0;

  monthLedger.forEach(item => {
    totalRequiredTillDate += item.required;
    if (remainingPool >= item.required) {
      item.paid = item.required;
      item.status = 'paid';
      remainingPool -= item.required;
    } else if (remainingPool > 0) {
      item.paid = remainingPool;
      item.status = 'partial';
      remainingPool = 0;
    } else {
      item.paid = 0;
      item.status = 'unpaid';
    }
  });

  return {
    totalPaid,
    amountOwing: totalRequiredTillDate > totalPaid ? (totalRequiredTillDate - totalPaid) : 0,
    advanceDues: remainingPool,
    duesRating: totalRequiredTillDate > 0 ? Math.round((totalPaid / totalRequiredTillDate) * 100) : 100,
    ledger: monthLedger
  };
}

function calculateMemberProjects(phone) {
  const projects = getFinancialRecords("omega_projects").filter(p => p.memberPhone === phone);
  return {
    total: projects.reduce((sum, p) => sum + Number(p.amount), 0),
    list: projects
  };
}

async function calculateGroupFinancials(groupKey) {
  const users = await getUsers();
  let groupMembers = [];

  if (groupKey === "workforce") {
    groupMembers = users.filter(u => u.isWorker);
  } else {
    groupMembers = users.filter(u => u.group && u.group.toLowerCase() === groupKey.toLowerCase());
  }

  const duesPayments = getFinancialRecords("omega_dues_payments");
  const duesPaid = duesPayments
    .filter(p => groupMembers.some(m => m.phone === p.memberPhone))
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const projects = getFinancialRecords("omega_projects");
  const levyPaid = projects
    .filter(p => groupMembers.some(m => m.phone === p.memberPhone))
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const groupExpensesRecords = getFinancialRecords("omega_group_expenses");
  const expenses = groupExpensesRecords
    .filter(e => e.group && e.group.toLowerCase() === groupKey.toLowerCase())
    .reduce((sum, e) => sum + Number(e.amount), 0);

  let duesArrears = 0;
  groupMembers.forEach(m => {
    let calc = calculateMemberDues(m.phone);
    duesArrears += calc.amountOwing;
  });

  const totalLevyArrears = Number(localStorage.getItem(`omega_levy_arrears_${groupKey}`)) || 0;
  const inflow = duesPaid + levyPaid;
  const totalBalance = inflow - expenses;

  return {
    inflow,
    duesPaid,
    levyPaid,
    duesArrears,
    totalLevyArrears,
    expenses,
    totalBalance,
    members: groupMembers
  };
}

function performSilentAutoRefresh() {
  if (document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
  if (document.querySelector('.modal-overlay')) return;
  if (document.querySelector('.admin-sidebar.open') || document.querySelector('.member-sidebar.open')) return;
}

// Authentication Selection
function renderAuthSelection() {
  currentActiveState = { type: 'guest', view: 'home', user: null };
  const container = document.getElementById("view-container");
  container.innerHTML = `
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

// MEMBER LOGIN
function renderLogin() {
  currentActiveState = { type: 'guest', view: 'login', user: null };
  const container = document.getElementById("view-container");
  container.innerHTML = `
    <div class="auth-box">
      <h2>Member Login</h2>
      <form id="login-form" onsubmit="handleLogin(event)">
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

  const users = await getUsers();
  const user = users.find(u => u.phone === phone && u.pin === pin);

  if (!user) {
    alert("Invalid phone number or 4-digit PIN!");
    return;
  }

  localStorage.setItem("omega_current_user", JSON.stringify(user));
  routeUserDashboard(user, 'home');
}

// MEMBER REGISTRATION FUNNEL
function renderRegistrationStep1() {
  currentActiveState = { type: 'guest', view: 'reg1', user: null };
  const container = document.getElementById("view-container");
  container.innerHTML = `
    <div class="auth-box">
      <h2>Member Registration (1/3)</h2>
      <form id="reg-step1" onsubmit="handleRegStep1(event)">
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
    fullName: document.getElementById("reg-name").value.trim(),
    phone: document.getElementById("reg-phone").value.trim(),
    whatsapp: document.getElementById("reg-whatsapp").value.trim(),
    email: document.getElementById("reg-email").value.trim(),
    dob: document.getElementById("reg-dob").value,
    origin: document.getElementById("reg-origin").value.trim(),
    residence: document.getElementById("reg-residence").value.trim(),
    address: document.getElementById("reg-address").value.trim()
  };

  const users = await getUsers();
  if (users.some(u => u.phone === tempRegData.phone)) {
    alert("This phone number is already registered!");
    return;
  }

  renderRegistrationStep2();
}

function renderRegistrationStep2() {
  currentActiveState = { type: 'guest', view: 'reg2', user: null };
  const container = document.getElementById("view-container");
  container.innerHTML = `
    <div class="auth-box">
      <h2>Member Assignment (2/3)</h2>
      <form id="reg-step2" onsubmit="handleRegStep2(event)">
        <label>Are you married?</label>
        <select id="reg-married" onchange="toggleGenderPopup()" required>
          <option value="">-- Select Option --</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>

        <div id="gender-popup-container" class="hidden">
          <label>Gender (Fellowship Allocation)</label>
          <select id="reg-gender">
            <option value="">-- Select Gender --</option>
            <option value="male">Male (Men Fellowship)</option>
            <option value="female">Female (Women Fellowship)</option>
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
  const genderContainer = document.getElementById("gender-popup-container");
  if (isMarried === "yes") {
    genderContainer.classList.remove("hidden");
  } else {
    genderContainer.classList.add("hidden");
  }
}

function toggleDeptPopup() {
  const isWorker = document.getElementById("reg-worker").value;
  const deptContainer = document.getElementById("dept-popup-container");
  if (isWorker === "yes") {
    deptContainer.classList.remove("hidden");
  } else {
    deptContainer.classList.add("hidden");
  }
}

function handleRegStep2(e) {
  e.preventDefault();
  const isMarried = document.getElementById("reg-married").value;
  const gender = document.getElementById("reg-gender").value;
  const isWorker = document.getElementById("reg-worker").value;
  const department = document.getElementById("reg-dept").value;

  let assignedGroup = "youth";
  if (isMarried === "no") {
    assignedGroup = "youth";
  } else if (isMarried === "yes") {
    if (gender === "male") assignedGroup = "men";
    else if (gender === "female") assignedGroup = "women";
    else {
      alert("Please select gender to proceed!");
      return;
    }
  }

  if (isWorker === "yes" && !department) {
    alert("Please select workforce department!");
    return;
  }

  tempRegData.isMarried = isMarried === "yes";
  tempRegData.gender = gender;
  tempRegData.group = assignedGroup;
  tempRegData.isWorker = isWorker === "yes";
  tempRegData.department = isWorker === "yes" ? department : "";

  renderRegistrationStep3();
}

function renderRegistrationStep3() {
  currentActiveState = { type: 'guest', view: 'reg3', user: null };
  const container = document.getElementById("view-container");
  container.innerHTML = `
    <div class="auth-box">
      <h2>Security & Photo (3/3)</h2>
      <form id="reg-step3" onsubmit="handleFinalRegistration(event)">
        <label>Enter 4-Digit Login PIN</label>
        <input type="password" id="reg-pin" maxlength="4" required placeholder="****" />

        <label>Confirm Login PIN</label>
        <input type="password" id="reg-pin-confirm" maxlength="4" required placeholder="****" />

        <label>Upload Profile Picture</label>
        <input type="file" id="reg-pic" accept="image/*" required />

        <button type="submit" class="btn-primary">SAVE ACCOUNT</button>
      </form>
    </div>
  `;
}

function handleFinalRegistration(e) {
  e.preventDefault();
  const pin = document.getElementById("reg-pin").value;
  const pinConfirm = document.getElementById("reg-pin-confirm").value;

  if (pin !== pinConfirm) {
    alert("PINs do not match!");
    return;
  }

  const fileInput = document.getElementById("reg-pic");
  const reader = new FileReader();

  reader.onload = async function(event) {
    tempRegData.profilePic = event.target.result;
    tempRegData.pin = pin;

    const success = await saveUserToSupabase(tempRegData);
    if (success) {
      alert("Registration saved successfully to Supabase! Please log in.");
      renderLogin();
    }
  };

  if (fileInput.files[0]) {
    reader.readAsDataURL(fileInput.files[0]);
  } else {
    tempRegData.profilePic = "";
    tempRegData.pin = pin;
    (async () => {
      const success = await saveUserToSupabase(tempRegData);
      if (success) {
        alert("Registration saved successfully to Supabase! Please log in.");
        renderLogin();
      }
    })();
  }
}

// MEMBER DASHBOARD ROUTING
async function routeUserDashboard(user, view = 'home', isAutoRefresh = false) {
  const users = await getUsers();
  const latestUser = users.find(u => u.phone === user.phone) || user;
  currentActiveState = { type: 'member', view: view, user: latestUser };
  
  const container = document.getElementById("view-container");
  let groupTitle = `${latestUser.group.toUpperCase()} FELLOWSHIP`;

  const financials = calculateMemberDues(latestUser.phone);
  const projectsData = calculateMemberProjects(latestUser.phone);
  const currentMonthRate = getRateForMonth(new Date().getFullYear(), new Date().getMonth());

  const userNotifications = getFinancialRecords(`omega_notifications_${latestUser.phone}`);
  const userAttendance = getFinancialRecords(`omega_attendance_${latestUser.phone}`);

  let mainBodyContent = "";

  if (view === 'home') {
    mainBodyContent = `
      <div class="welcome-banner">
        <h2>${groupTitle} DASHBOARD ${latestUser.isWorker ? `<span class="workforce-badge">| ${latestUser.department ? latestUser.department.toUpperCase() : 'Workforce'}</span>` : ''}</h2>
        <p class="slogan-text">Omega City Of Mercy - Keeping financial records transparent.</p>
      </div>

      <div class="member-card-grid">
        <div class="m-card">
          <h4>Total Dues Paid</h4>
          <p>₦${financials.totalPaid.toLocaleString()}</p>
        </div>
        <div class="m-card">
          <h4>Amount Owing</h4>
          <p style="color: ${financials.amountOwing > 0 ? 'var(--danger)' : 'var(--gold-primary)'}">₦${financials.amountOwing.toLocaleString()}</p>
        </div>
        <div class="m-card">
          <h4>Current Dues Rate</h4>
          <p>₦${currentMonthRate.toLocaleString()}</p>
        </div>
        <div class="m-card">
          <h4>Advance Dues</h4>
          <p>₦${financials.advanceDues.toLocaleString()}</p>
        </div>
        <div class="m-card">
          <h4>Dues Rating</h4>
          <p>${financials.duesRating}%</p>
        </div>
        <div class="m-card">
          <h4>Project Contributions</h4>
          <p>₦${projectsData.total.toLocaleString()}</p>
        </div>
      </div>
    `;
  } else if (view === 'dues-history') {
    let historyRows = financials.ledger.map(item => `
      <tr>
        <td>${item.label}</td>
        <td>₦${item.required.toLocaleString()}</td>
        <td>₦${item.paid.toLocaleString()}</td>
        <td><span class="badge ${item.status}">${item.status.toUpperCase()}</span></td>
      </tr>
    `).join("");

    mainBodyContent = `
      <div class="admin-content-area" style="padding: 0;">
        <h3>My Dues Payment History</h3>
        <table class="members-table">
          <thead>
            <tr>
              <th>Month</th>
              <th>Required</th>
              <th>Paid</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${historyRows}
          </tbody>
        </table>
      </div>
    `;
  } else if (view === 'project-levy') {
    let projRows = projectsData.list.map((p, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${p.date}</td>
        <td>${p.projectName}</td>
        <td>₦${Number(p.amount).toLocaleString()}</td>
      </tr>
    `).join("");

    mainBodyContent = `
      <div class="admin-content-area" style="padding: 0;">
        <h3>My Project & Levy Contributions</h3>
        <table class="members-table">
          <thead>
            <tr>
              <th>S/N</th>
              <th>Date</th>
              <th>Project Title</th>
              <th>Amount Paid</th>
            </tr>
          </thead>
          <tbody>
            ${projRows || '<tr><td colspan="4" style="text-align:center;">No project contributions recorded yet.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  } else if (view === 'notifications') {
    let listHtml = userNotifications.map((n, i) => `
      <div class="settings-card" style="cursor:pointer;">
        <h4 style="color:var(--gold-primary); margin-bottom:4px;">${n.title}</h4>
        <p style="font-size:0.75rem; color:var(--text-muted);">${n.date}</p>
        <p style="font-size:0.85rem; margin-top:6px;">${n.message}</p>
      </div>
    `).join('');

    mainBodyContent = `
      <div class="admin-content-area" style="padding: 0;">
        <h3>My Notifications</h3>
        ${listHtml || '<p style="color:var(--text-muted);">No notifications yet.</p>'}
      </div>
    `;
  } else if (view === 'attendance') {
    let attRows = userAttendance.map((a, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${a.date}</td>
        <td>${a.serviceName || 'Sunday Service'}</td>
        <td><span class="badge paid">PRESENT</span></td>
      </tr>
    `).join('');

    mainBodyContent = `
      <div class="admin-content-area" style="padding: 0;">
        <h3>My Attendance Record</h3>
        <table class="members-table">
          <thead>
            <tr>
              <th>S/N</th>
              <th>Date</th>
              <th>Service / Event</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${attRows || '<tr><td colspan="4" style="text-align:center;">No attendance recorded yet.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  } else if (view === 'settings') {
    mainBodyContent = `
      <div class="admin-content-area" style="padding: 0;">
        <h3>Member Settings</h3>
        <div class="settings-card">
          <h4><i class="fa-solid fa-palette"></i> Theme Settings</h4>
          <select onchange="changeTheme(this.value)">
            <option value="dark">Dark Gold Theme (Default)</option>
            <option value="light">Light Theme</option>
          </select>
        </div>
      </div>
    `;
  }

  const isSidebarOpen = document.getElementById("member-sidebar")?.classList.contains("open");

  container.innerHTML = `
    <div class="member-dashboard-wrapper">
      <header class="member-topbar">
        <div class="topbar-left">
          <button class="toggle-btn-topleft" onclick="toggleMemberSidebar()">
            <i class="fa-solid fa-bars"></i> Menu
          </button>
          <div class="member-profile-section">
            <img src="${latestUser.profilePic || 'https://via.placeholder.com/45'}" class="member-avatar-img" />
            <div>
              <h4 style="font-size:0.85rem;">${latestUser.fullName}</h4>
              <span class="member-id-tag">ID: OCM-${latestUser.phone.slice(-4)}</span>
            </div>
          </div>
        </div>
        <div class="member-topbar-right">
          <div class="notification-bell" onclick="routeUserDashboard(latestUser, 'notifications')">
            <i class="fa-solid fa-bell"></i>
            <span class="bell-badge">${userNotifications.length}</span>
          </div>
          <button onclick="renderAuthSelection()" class="btn-logout"><i class="fa-solid fa-right-from-bracket"></i></button>
        </div>
      </header>

      <div class="member-content">
        ${mainBodyContent}
        <div class="read-only-notice">
          <i class="fa-solid fa-lock"></i> Financial records are read-only for members.
        </div>
      </div>
    </div>
  `;
}

// MAIN ADMIN LOGIN & DASHBOARD
function renderAdminLogin() {
  currentActiveState = { type: 'guest', view: 'admin-login', user: null };
  const container = document.getElementById("view-container");
  container.innerHTML = `
    <div class="auth-box">
      <h2>Main Admin Login</h2>
      <form id="admin-login-form" onsubmit="handleAdminLogin(event)">
        <div class="input-group">
          <label>Admin Phone Number</label>
          <input type="tel" id="admin-phone" required placeholder="Enter phone number" />
        </div>
        <div class="input-group">
          <label>8-Digit PIN</label>
          <input type="password" id="admin-pin" maxlength="8" required placeholder="********" />
        </div>
        <button type="submit" class="btn-primary">Access Admin Portal</button>
        <button type="button" onclick="renderAuthSelection()" class="btn-text">Back to Home</button>
      </form>
    </div>
  `;
}

function handleAdminLogin(e) {
  e.preventDefault();
  renderAdminDashboard();
}

function toggleSidebar() {
  const sidebar = document.getElementById("admin-sidebar");
  sidebar.classList.toggle("open");

  let backdrop = document.getElementById("sidebar-backdrop");
  if (sidebar.classList.contains("open")) {
    if (!backdrop) {
      backdrop = document.createElement("div");
      backdrop.id = "sidebar-backdrop";
      backdrop.className = "sidebar-backdrop-overlay";
      backdrop.onclick = () => {
        sidebar.classList.remove("open");
        backdrop.remove();
      };
      document.body.appendChild(backdrop);
    }
  } else {
    if (backdrop) backdrop.remove();
  }
}

function toggleSubMenu(menuId) {
  const el = document.getElementById(menuId);
  if (el) {
    el.classList.toggle("hidden");
  }
}

// FULL ADMIN DASHBOARD (NOW ASYNC FOR SUPABASE FETCHING)
async function renderAdminDashboard(view = "home", isAutoRefresh = false) {
  currentActiveState = { type: 'admin', view: view, user: null };
  const container = document.getElementById("view-container");
  let mainContentHtml = "";

  const users = await getUsers(); // Fetches live from Supabase

  const duesPayments = getFinancialRecords("omega_dues_payments");
  const groupExpenses = getFinancialRecords("omega_group_expenses");
  const totalDues = duesPayments.reduce((sum, item) => sum + Number(item.amount), 0);
  const totalGroupExpenses = groupExpenses.reduce((sum, item) => sum + Number(item.amount), 0);

  const transactions = getFinancialRecords("omega_transactions");
  const totalInflow = transactions.filter(t => t.type === 'inflow').reduce((sum, item) => sum + Number(item.amount), 0);
  const totalHandover = transactions.filter(t => t.type === 'handover').reduce((sum, item) => sum + Number(item.amount), 0);
  const totalGroupBalance = totalDues + totalInflow + totalHandover - totalGroupExpenses;

  if (view === "home") {
    mainContentHtml = `
      <section class="cards-container">
        <div class="balance-card-full">
          <h4>TOTAL GROUP BALANCE</h4>
          <p>₦${totalGroupBalance.toLocaleString()}</p>
          <small>(Dues + Inflow + Handover - Expenses)</small>
        </div>

        <div class="admin-cards-grid-2x2">
          <div class="summary-card">
            <h4>TOTAL REGISTERED MEMBERS</h4>
            <p style="color: var(--gold-primary);">${users.length}</p>
          </div>
          <div class="summary-card">
            <h4>TOTAL GROUP DUES</h4>
            <p style="color: var(--gold-primary);">₦${totalDues.toLocaleString()}</p>
          </div>
          <div class="summary-card">
            <h4>TOTAL GROUP INFLOW</h4>
            <p style="color: var(--success);">₦${totalInflow.toLocaleString()}</p>
          </div>
          <div class="summary-card">
            <h4>TOTAL GROUP EXPENSES</h4>
            <p style="color: var(--danger);">₦${totalGroupExpenses.toLocaleString()}</p>
          </div>
        </div>
      </section>
    `;
  } else if (["men", "women", "youth", "workforce"].includes(view)) {
    const fin = await calculateGroupFinancials(view);
    const titleName = view.toUpperCase() + (view === 'workforce' ? '' : ' FELLOWSHIP');

    let rows = fin.members.map((u, index) => `
      <tr>
        <td>${index + 1}</td>
        <td><a onclick="openMemberDetailsModal('${u.phone}')" style="color:var(--gold-primary); cursor:pointer; text-decoration:underline;">${u.fullName}</a></td>
        <td>${u.phone}</td>
        <td>${u.isWorker ? (u.department || 'Yes') : 'No'}</td>
        <td>
          <div class="btn-action-group">
            <button onclick="editMember('${u.phone}')" class="btn-sm-edit">Edit</button>
            <button onclick="deleteMember('${u.phone}')" class="btn-sm-danger">Delete</button>
          </div>
        </td>
      </tr>
    `).join("");

    mainContentHtml = `
      <div class="admin-content-area">
        <h3>${titleName} FINANCIAL SUMMARY</h3>
        
        <div class="balance-card-full">
          <h4>TOTAL ${view.toUpperCase()} BALANCE</h4>
          <p>₦${fin.totalBalance.toLocaleString()}</p>
          <small>(Dues Paid + Levy Paid - Expenses)</small>
        </div>

        <div class="admin-cards-grid-2x2" style="margin-bottom: 20px;">
          <div class="summary-card">
            <h4>INFLOW</h4>
            <p style="color: var(--success);">₦${fin.inflow.toLocaleString()}</p>
          </div>
          <div class="summary-card">
            <h4>DUES PAID</h4>
            <p style="color: var(--gold-primary);">₦${fin.duesPaid.toLocaleString()}</p>
          </div>
          <div class="summary-card">
            <h4>LEVY PAID</h4>
            <p style="color: #a855f7;">₦${fin.levyPaid.toLocaleString()}</p>
          </div>
          <div class="summary-card">
            <h4>EXPENSES</h4>
            <p style="color: var(--danger);">₦${fin.expenses.toLocaleString()}</p>
          </div>
        </div>

        <h3>${titleName} Members List</h3>
        <table class="members-table">
          <thead>
            <tr>
              <th>S/N</th>
              <th>Full Name</th>
              <th>Phone</th>
              <th>Workforce / Dept</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="5" style="text-align:center;">No members in this group yet.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  } else if (["all", "dept-sanitation", "dept-security", "dept-usher", "dept-technical", "dept-children", "dept-minister", "dept-choir"].includes(view)) {
    let filteredUsers = users;

    if (view === "dept-sanitation") filteredUsers = users.filter(u => u.department && u.department.toLowerCase() === "sanitation");
    else if (view === "dept-security") filteredUsers = users.filter(u => u.department && u.department.toLowerCase() === "security");
    else if (view === "dept-usher") filteredUsers = users.filter(u => u.department && u.department.toLowerCase() === "usher");
    else if (view === "dept-technical") filteredUsers = users.filter(u => u.department && u.department.toLowerCase() === "technical");
    else if (view === "dept-children") filteredUsers = users.filter(u => u.department && u.department.toLowerCase() === "children class");
    else if (view === "dept-minister") filteredUsers = users.filter(u => u.department && u.department.toLowerCase() === "minister");
    else if (view === "dept-choir") filteredUsers = users.filter(u => u.department && u.department.toLowerCase() === "choir");

    let rows = filteredUsers.map((u, index) => `
      <tr>
        <td>${index + 1}</td>
        <td><a onclick="openMemberDetailsModal('${u.phone}')" style="color:var(--gold-primary); cursor:pointer; text-decoration:underline;">${u.fullName}</a></td>
        <td>${u.phone}</td>
        <td>${u.group ? u.group.toUpperCase() : 'MEMBER'}</td>
        <td>${u.isWorker ? (u.department || 'Yes') : 'No'}</td>
        <td>
          <div class="btn-action-group">
            <button onclick="editMember('${u.phone}')" class="btn-sm-edit">Edit</button>
            <button onclick="deleteMember('${u.phone}')" class="btn-sm-danger">Delete</button>
          </div>
        </td>
      </tr>
    `).join("");

    mainContentHtml = `
      <div class="admin-content-area">
        ${view === 'all' ? `
          <div class="balance-card-full" style="margin-bottom: 20px;">
            <h4>TOTAL REGISTERED MEMBERS (DATABASE)</h4>
            <p>${users.length}</p>
            <small>Men + Women + Youth Fellowships Combined</small>
          </div>
        ` : ''}

        <h3>${view.toUpperCase().replace('DEPT-', 'WORKFORCE: ')} View</h3>
        <table class="members-table">
          <thead>
            <tr>
              <th>S/N</th>
              <th>Full Name</th>
              <th>Phone</th>
              <th>Group</th>
              <th>Department</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="6" style="text-align:center;">No records found in database.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  } else if (view === "projects") {
    let memberOptions = users.map(u => `<option value="${u.phone}">${u.fullName} (${u.phone})</option>`).join("");
    const projects = getFinancialRecords("omega_projects");

    let rows = projects.map((p, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${p.date}</td>
        <td>${p.memberName}</td>
        <td>${p.projectName}</td>
        <td>₦${Number(p.amount).toLocaleString()}</td>
      </tr>
    `).join("");

    mainContentHtml = `
      <div class="admin-content-area">
        <h3>Record Group / Building Project Contribution</h3>
        <div class="settings-card">
          <form onsubmit="handleProjectEntry(event)">
            <label>Select Member</label>
            <select id="proj-member-phone" required>
              <option value="">-- Select Member --</option>
              ${memberOptions}
            </select>

            <label>Project / Levy Title</label>
            <input type="text" id="proj-title" placeholder="e.g. Building Project" required />

            <label>Contribution Amount (₦)</label>
            <input type="number" id="proj-amount" min="1" required placeholder="5000" />

            <label>Date</label>
            <input type="date" id="proj-date" required />

            <button type="submit" class="btn-primary">Record Contribution</button>
          </form>
        </div>

        <h3>Project Contribution History</h3>
        <table class="members-table">
          <thead>
            <tr>
              <th>S/N</th>
              <th>Date</th>
              <th>Member</th>
              <th>Project</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="5" style="text-align:center;">No project records found.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  } else if (view === "settings") {
    mainContentHtml = `
      <div class="admin-content-area">
        <h3>Settings & Administrative Controls</h3>

        <div class="settings-card">
          <h4><i class="fa-solid fa-coins"></i> Configure Monthly Dues Rate</h4>
          <form onsubmit="handleChangeDuesRate(event)">
            <label>New Monthly Amount (₦)</label>
            <input type="number" id="new-dues-rate" min="1" required placeholder="e.g. 1000" />

            <label>Effective Month (YYYY-MM)</label>
            <input type="month" id="dues-effective-month" required />

            <button type="submit" class="btn-primary">Update Dues Rate</button>
          </form>
        </div>
      </div>
    `;
  }

  const isSidebarOpen = document.getElementById("admin-sidebar")?.classList.contains("open");

  container.innerHTML = `
    <div class="admin-wrapper">
      <main class="admin-main">
        <header class="admin-topbar">
          <div class="topbar-left">
            <button class="toggle-btn-topleft" onclick="toggleSidebar()">
              <i class="fa-solid fa-bars"></i> Menu
            </button>
            <h3>Admin Portal</h3>
          </div>
        </header>
        ${mainContentHtml}
      </main>

      <aside class="admin-sidebar ${isSidebarOpen ? 'open' : ''}" id="admin-sidebar">
        <div class="sidebar-header">
          <span>NAVIGATION</span>
          <button class="close-sidebar-btn" onclick="toggleSidebar()"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <ul class="sidebar-menu">
          <li><a onclick="renderAdminDashboard('home'); toggleSidebar();" class="${view === 'home' ? 'active' : ''}"><span class="menu-item-left"><i class="fa-solid fa-chart-line"></i> Dashboard</span></a></li>
          <li><a onclick="renderAdminDashboard('projects'); toggleSidebar();" class="${view === 'projects' ? 'active' : ''}"><span class="menu-item-left"><i class="fa-solid fa-diagram-project"></i> Group Projects</span></a></li>
          <li><a onclick="renderAdminDashboard('all'); toggleSidebar();" class="${view === 'all' ? 'active' : ''}"><span class="menu-item-left"><i class="fa-solid fa-users"></i> View All Members</span></a></li>
          <li><a onclick="renderAdminDashboard('settings'); toggleSidebar();" class="${view === 'settings' ? 'active' : ''}"><span class="menu-item-left"><i class="fa-solid fa-gear"></i> Settings</span></a></li>
          <li><a onclick="renderAuthSelection()"><span class="menu-item-left"><i class="fa-solid fa-right-from-bracket"></i> Logout</span></a></li>
        </ul>
      </aside>
    </div>
  `;
}

// MEMBER DETAILS MODAL & ACTIONS
async function openMemberDetailsModal(phone) {
  const users = await getUsers();
  const u = users.find(user => user.phone === phone);
  if (!u) return;

  const modalOverlay = document.createElement("div");
  modalOverlay.className = "modal-overlay";
  modalOverlay.id = "member-detail-modal";
  modalOverlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>Member Profile</h3>
        <button class="close-sidebar-btn" onclick="document.getElementById('member-detail-modal').remove()"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div style="display: flex; flex-direction: column; gap: 10px; font-size: 0.9rem;">
        <div style="text-align: center; margin-bottom: 10px;">
          <img src="${u.profilePic || 'https://via.placeholder.com/70'}" style="width: 70px; height: 70px; border-radius: 50%; border: 2px solid var(--gold-primary); object-fit: cover;" />
        </div>
        <div><strong>Full Name:</strong> ${u.fullName}</div>
        <div><strong>Phone Number:</strong> ${u.phone}</div>
        <div><strong>WhatsApp Number:</strong> ${u.whatsapp || u.phone}</div>
        <div><strong>Email:</strong> ${u.email || 'N/A'}</div>
        <div><strong>Fellowship Group:</strong> ${u.group ? u.group.toUpperCase() : 'N/A'}</div>
        <div><strong>Workforce Dept:</strong> ${u.isWorker ? (u.department || 'Yes') : 'No'}</div>
        
        <div style="display: flex; gap: 10px; margin-top: 15px;">
          <button onclick="document.getElementById('member-detail-modal').remove(); editMember('${u.phone}')" class="btn-primary" style="flex:1;">Edit Member</button>
          <button onclick="document.getElementById('member-detail-modal').remove(); deleteMember('${u.phone}')" class="btn-secondary" style="flex:1; border-color:var(--danger); color:var(--danger);">Delete Member</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modalOverlay);
}

async function handleProjectEntry(e) {
  e.preventDefault();
  const phone = document.getElementById("proj-member-phone").value;
  const projectName = document.getElementById("proj-title").value.trim();
  const amount = parseFloat(document.getElementById("proj-amount").value);
  const date = document.getElementById("proj-date").value;

  const users = await getUsers();
  const user = users.find(u => u.phone === phone);
  const memberName = user ? user.fullName : "Unknown";

  if (window.supabaseClient) {
    await window.supabaseClient
      .from('omega_projects')
      .upsert([
        {
          member_phone: phone,
          member_name: memberName,
          project_name: projectName,
          amount: amount,
          date: date
        }
      ], { onConflict: 'member_phone, project_name' });
  }

  const projects = getFinancialRecords("omega_projects");
  projects.push({ memberPhone: phone, memberName, projectName, amount, date });
  saveFinancialRecords("omega_projects", projects);

  alert("Project contribution recorded & replaced successfully!");
  renderAdminDashboard("projects");
}

function handleChangeDuesRate(e) {
  e.preventDefault();
  const rate = parseFloat(document.getElementById("new-dues-rate").value);
  const monthStr = document.getElementById("dues-effective-month").value;

  if (isNaN(rate) || rate <= 0 || !monthStr) {
    alert("Invalid rate or effective month!");
    return;
  }

  const rates = getDuesRates();
  rates.push({
    effectiveFrom: monthStr,
    rate: rate,
    admin: "Main Admin",
    dateSet: new Date().toISOString()
  });

  saveDuesRates(rates);
  alert(`New dues rate of ₦${rate.toLocaleString()} set starting ${monthStr}!`);
  renderAdminDashboard("settings");
}

async function editMember(phone) {
  const users = await getUsers();
  let user = users.find(u => u.phone === phone);
  if (!user) return;

  const newName = prompt("Edit Full Name:", user.fullName);
  if (newName === null) return;

  if (window.supabaseClient) {
    await window.supabaseClient.from('users').update({ full_name: newName.trim() }).eq('phone', phone);
  }
  
  alert("Member details updated successfully!");
  renderAdminDashboard('all');
}

async function deleteMember(phone) {
  if (confirm("Are you sure you want to delete this member?")) {
    if (window.supabaseClient) {
      await window.supabaseClient.from('users').delete().eq('phone', phone);
    }
    alert("Member deleted successfully.");
    renderAdminDashboard('all');
  }
}

function changeTheme(theme) {
  const body = document.getElementById("app-body");
  if (theme === "light") {
    body.className = "theme-light";
  } else {
    body.className = "theme-dark";
  }
}
