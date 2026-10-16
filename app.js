// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then(reg => {
      console.log('PWA Service Worker registered:', reg);
    }).catch(err => {
      console.error('Service Worker registration failed:', err);
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initDuesConfig();
  
  // 1. 6-Second Loading Screen Timer
  setTimeout(() => {
    const loadingScreen = document.getElementById("loading-screen");
    const appContainer = document.getElementById("app");
    
    loadingScreen.style.opacity = "0";
    loadingScreen.style.transition = "opacity 0.5s ease";
    
    setTimeout(() => {
      loadingScreen.classList.add("hidden");
      appContainer.classList.remove("hidden");
      renderAuthSelection();
    }, 500);
  }, 6000);
});

// Database Helper Functions
function getUsers() {
  return JSON.parse(localStorage.getItem("omega_users")) || [];
}

function saveUsers(users) {
  localStorage.setItem("omega_users", JSON.stringify(users));
}

function getDuesPayments() {
  return JSON.parse(localStorage.getItem("omega_dues_payments")) || [];
}

function saveDuesPayments(payments) {
  localStorage.setItem("omega_dues_payments", JSON.stringify(payments));
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

// Financial Ledger Engine Functions (Starting Jan 2026)
function getRateForMonth(year, monthIndex) { // monthIndex: 0 = Jan
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
  const payments = getDuesPayments().filter(p => p.memberPhone === phone);
  let totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  // Build monthly ledger list starting Jan 2026
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

  // Allocate total payments starting from oldest unpaid month
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

  let advanceDues = remainingPool; // Leftover goes to future months
  let amountOwing = totalRequiredTillDate > totalPaid ? (totalRequiredTillDate - totalPaid) : 0;
  let duesRating = totalRequiredTillDate > 0 ? Math.round((totalPaid / totalRequiredTillDate) * 100) : 100;

  return {
    totalPaid,
    amountOwing,
    advanceDues,
    duesRating,
    ledger: monthLedger
  };
}

// Render Authentication Choice Screen
function renderAuthSelection() {
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

function handleLogin(e) {
  e.preventDefault();
  const phone = document.getElementById("login-phone").value.trim();
  const pin = document.getElementById("login-pin").value.trim();

  const users = getUsers();
  const user = users.find(u => u.phone === phone && u.pin === pin);

  if (!user) {
    alert("Invalid phone number or 4-digit PIN!");
    return;
  }

  localStorage.setItem("omega_current_user", JSON.stringify(user));
  routeUserDashboard(user);
}

// MEMBER DASHBOARD ROUTING
function routeUserDashboard(user) {
  const container = document.getElementById("view-container");
  let groupTitle = `${user.group.toUpperCase()} Fellowship Dashboard`;

  const financials = calculateMemberDues(user.phone);
  const currentMonthRate = getRateForMonth(new Date().getFullYear(), new Date().getMonth());

  let historyRows = financials.ledger.map(item => `
    <tr>
      <td>${item.label}</td>
      <td>₦${item.required.toLocaleString()}</td>
      <td>₦${item.paid.toLocaleString()}</td>
      <td><span class="badge ${item.status}">${item.status.toUpperCase()}</span></td>
    </tr>
  `).join("");

  container.innerHTML = `
    <div class="member-dashboard-wrapper">
      <header class="member-topbar">
        <div class="member-profile-section">
          <img src="${user.profilePic || 'https://via.placeholder.com/45'}" class="member-avatar-img" />
          <div>
            <h4>${user.fullName}</h4>
            <span class="member-id-tag">ID: OCM-${user.phone.slice(-4)}</span> | <span class="member-phone-tag">${user.phone}</span>
          </div>
        </div>
        <div class="member-topbar-right">
          <div class="notification-bell">
            <i class="fa-solid fa-bell"></i>
            <span class="bell-badge">1</span>
          </div>
          <button onclick="logout()" class="btn-logout"><i class="fa-solid fa-right-from-bracket"></i></button>
        </div>
      </header>

      <div class="member-content">
        <div class="welcome-banner">
          <h2>${groupTitle} ${user.isWorker ? '<span class="workforce-badge">| Workforce</span>' : ''}</h2>
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
            <h4>Current Monthly Rate</h4>
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
            <p>₦0.00</p>
          </div>
        </div>

        <div class="admin-content-area" style="padding: 0; margin-bottom: 20px;">
          <h3 style="font-size:0.95rem;">Monthly Dues Breakdown (Since Jan 2026)</h3>
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

        <div class="read-only-notice">
          <i class="fa-solid fa-lock"></i> Financial records are read-only for members.
        </div>
      </div>
    </div>
  `;
}

function logout() {
  localStorage.removeItem("omega_current_user");
  renderAuthSelection();
}

// REGISTRATION FUNNEL - STEP 1
function renderRegistrationStep1() {
  const container = document.getElementById("view-container");
  container.innerHTML = `
    <div class="auth-box">
      <h2>Member Registration (1/3)</h2>
      <form id="reg-step1" onsubmit="handleRegStep1(event)">
        <input type="text" id="reg-name" placeholder="Full Name" required />
        <input type="tel" id="reg-phone" placeholder="Phone Number" required />
        <input type="tel" id="reg-whatsapp" placeholder="WhatsApp Number" required />
        <input type="email" id="reg-email" placeholder="Email Address" required />
        <input type="text" id="reg-origin" placeholder="State of Origin" required />
        <input type="text" id="reg-residence" placeholder="State of Residence" required />
        <input type="text" id="reg-address" placeholder="House Address" required />
        <input type="text" id="reg-nationality" placeholder="Nationality" required />
        <button type="submit" class="btn-primary">Proceed</button>
        <button type="button" onclick="renderAuthSelection()" class="btn-text">Cancel</button>
      </form>
    </div>
  `;
}

let tempRegData = {};

function handleRegStep1(e) {
  e.preventDefault();
  tempRegData = {
    fullName: document.getElementById("reg-name").value.trim(),
    phone: document.getElementById("reg-phone").value.trim(),
    whatsapp: document.getElementById("reg-whatsapp").value.trim(),
    email: document.getElementById("reg-email").value.trim(),
    origin: document.getElementById("reg-origin").value.trim(),
    residence: document.getElementById("reg-residence").value.trim(),
    address: document.getElementById("reg-address").value.trim(),
    nationality: document.getElementById("reg-nationality").value.trim()
  };

  const users = getUsers();
  if (users.some(u => u.phone === tempRegData.phone)) {
    alert("This phone number is already registered!");
    return;
  }

  renderRegistrationStep2();
}

// REGISTRATION FUNNEL - STEP 2
function renderRegistrationStep2() {
  const container = document.getElementById("view-container");
  container.innerHTML = `
    <div class="auth-box">
      <h2>Group Assignment (2/3)</h2>
      <form id="reg-step2" onsubmit="handleRegStep2(event)">
        <label>Marital Status</label>
        <select id="reg-marital" onchange="toggleGenderDropdown()" required>
          <option value="">-- Select Status --</option>
          <option value="single">Single</option>
          <option value="married">Married</option>
        </select>

        <div id="gender-container" class="hidden">
          <label>Gender</label>
          <select id="reg-gender">
            <option value="">-- Select Gender --</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>

        <label>Are you a worker?</label>
        <select id="reg-worker" required>
          <option value="no">No</option>
          <option value="yes">Yes</option>
        </select>

        <button type="submit" class="btn-primary">Next</button>
      </form>
    </div>
  `;
}

function toggleGenderDropdown() {
  const marital = document.getElementById("reg-marital").value;
  const genderContainer = document.getElementById("gender-container");
  if (marital === "married") {
    genderContainer.classList.remove("hidden");
  } else {
    genderContainer.classList.add("hidden");
  }
}

function handleRegStep2(e) {
  e.preventDefault();
  const marital = document.getElementById("reg-marital").value;
  const gender = document.getElementById("reg-gender").value;
  const workerChoice = document.getElementById("reg-worker").value;

  let assignedGroup = "youth";
  if (marital === "single") {
    assignedGroup = "youth";
  } else if (marital === "married") {
    if (gender === "male") assignedGroup = "men";
    else if (gender === "female") assignedGroup = "women";
  }

  tempRegData.marital = marital;
  tempRegData.gender = gender;
  tempRegData.group = assignedGroup;
  tempRegData.isWorker = workerChoice === "yes";

  renderRegistrationStep3();
}

// REGISTRATION FUNNEL - STEP 3
function renderRegistrationStep3() {
  const container = document.getElementById("view-container");
  container.innerHTML = `
    <div class="auth-box">
      <h2>Security & Profile (3/3)</h2>
      <form id="reg-step3" onsubmit="handleFinalRegistration(event)">
        <label>Upload Profile Picture</label>
        <input type="file" id="reg-pic" accept="image/*" required />
        
        <label>Choose 4-Digit PIN</label>
        <input type="password" id="reg-pin" maxlength="4" required placeholder="****" />

        <label>Re-enter 4-Digit PIN</label>
        <input type="password" id="reg-pin-confirm" maxlength="4" required placeholder="****" />

        <button type="submit" class="btn-primary">Complete Registration</button>
      </form>
    </div>
  `;
}

function handleFinalRegistration(e) {
  e.preventDefault();
  const pin = document.getElementById("reg-pin").value;
  const pinConfirm = document.getElementById("reg-pin-confirm").value;

  if (pin !== pinConfirm) {
    alert("PINs do not match! Please re-enter.");
    return;
  }

  const fileInput = document.getElementById("reg-pic");
  const reader = new FileReader();

  reader.onload = function(event) {
    tempRegData.profilePic = event.target.result;
    tempRegData.pin = pin;

    const users = getUsers();
    users.push(tempRegData);
    saveUsers(users);

    alert("Registration successful! Please log in.");
    renderLogin();
  };

  if (fileInput.files[0]) {
    reader.readAsDataURL(fileInput.files[0]);
  } else {
    tempRegData.profilePic = "";
    const users = getUsers();
    users.push(tempRegData);
    saveUsers(users);

    alert("Registration successful! Please log in.");
    renderLogin();
  }
}

// MAIN ADMIN LOGIN
function renderAdminLogin() {
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

// ADMIN DASHBOARD & ADVANCED SETTINGS
function renderAdminDashboard(view = "home") {
  const container = document.getElementById("view-container");
  let mainContentHtml = "";

  if (view === "home") {
    const allPayments = getDuesPayments();
    const totalDuesInflow = allPayments.reduce((sum, p) => sum + p.amount, 0);

    mainContentHtml = `
      <section class="cards-container">
        <div class="summary-card">
          <h4>Total Group Inflow</h4>
          <p>₦${totalDuesInflow.toLocaleString()}</p>
        </div>
        <div class="summary-card">
          <h4>Total Group Expenses</h4>
          <p>₦0.00</p>
        </div>
        <div class="summary-card">
          <h4>Total Group Dues</h4>
          <p>₦${totalDuesInflow.toLocaleString()}</p>
        </div>
        <div class="summary-card">
          <h4>Total Group Balance</h4>
          <p>₦${totalDuesInflow.toLocaleString()}</p>
        </div>
      </section>
    `;
  } else if (view === "dues-entry") {
    const users = getUsers();
    let memberOptions = users.map(u => `<option value="${u.phone}">${u.fullName} (${u.phone})</option>`).join("");

    mainContentHtml = `
      <div class="admin-content-area">
        <h3>Record Member Dues Payment</h3>
        <div class="admin-form-card">
          <form onsubmit="handleDuesEntry(event)">
            <label>Select Member</label>
            <select id="dues-member-phone" required>
              <option value="">-- Select Member --</option>
              ${memberOptions}
            </select>

            <label>Amount (₦)</label>
            <input type="number" id="dues-amount" min="1" required placeholder="500" />

            <label>Payment Mode</label>
            <select id="dues-mode" onchange="toggleBackdateFields()" required>
              <option value="current">Current (Clear Oldest Unpaid Month First)</option>
              <option value="backdate">Backdate Specific Historical Month</option>
            </select>

            <div id="backdate-fields" class="hidden">
              <label>Historical Payment Date</label>
              <input type="date" id="dues-backdate" />
            </div>

            <button type="submit" class="btn-primary">Record Payment</button>
          </form>
        </div>
      </div>
    `;
  } else if (view === "settings") {
    const rates = getDuesRates();
    let rateRows = rates.map(r => `
      <tr>
        <td>₦${r.rate.toLocaleString()}</td>
        <td>${r.effectiveFrom}</td>
        <td>${r.admin}</td>
      </tr>
    `).join("");

    mainContentHtml = `
      <div class="admin-content-area">
        <h3>Admin Settings & Controls</h3>
        
        <div class="settings-grid">
          <!-- Change Monthly Dues Rate -->
          <div class="admin-form-card">
            <h4>Change Monthly Dues Rate</h4>
            <form onsubmit="handleChangeDuesRate(event)">
              <label>New Monthly Amount (₦)</label>
              <input type="number" id="new-dues-rate" min="1" required placeholder="e.g. 1000" />

              <label>Effective Month (YYYY-MM)</label>
              <input type="month" id="dues-effective-month" required />

              <button type="submit" class="btn-primary">Update Dues Rate</button>
            </form>

            <h5 style="margin-top:15px; color:var(--gold-primary);">Rate History</h5>
            <table class="members-table" style="margin-top:6px;">
              <thead><tr><th>Rate</th><th>Effective</th><th>By</th></tr></thead>
              <tbody>${rateRows}</tbody>
            </table>
          </div>

          <!-- Notification Sound Settings -->
          <div class="admin-form-card">
            <h4>Notification Sound Setup</h4>
            <div style="display:flex; flex-direction:column; gap:8px;">
              ${[1,2,3,4,5,6,7,8,9,10].map(n => `
                <div class="sound-item">
                  <span>Sound Option ${n}</span>
                  <button type="button" onclick="previewSound(${n})" class="btn-sm-preview">Preview</button>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  } else if (["all", "men", "women", "youth", "workforce"].includes(view)) {
    const users = getUsers();
    let filteredUsers = users;
    if (view === "men") filteredUsers = users.filter(u => u.group === "men");
    else if (view === "women") filteredUsers = users.filter(u => u.group === "women");
    else if (view === "youth") filteredUsers = users.filter(u => u.group === "youth");
    else if (view === "workforce") filteredUsers = users.filter(u => u.isWorker);

    let rows = filteredUsers.map((u, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${u.fullName}</td>
        <td>${u.phone}</td>
        <td>${u.group.toUpperCase()}</td>
        <td>${u.isWorker ? 'Yes' : 'No'}</td>
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
        <h3>${view.toUpperCase()} Members Management</h3>
        <table class="members-table">
          <thead>
            <tr>
              <th>S/N</th>
              <th>Full Name</th>
              <th>Phone</th>
              <th>Group</th>
              <th>Worker</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="6" style="text-align:center;">No members found.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  } else {
    mainContentHtml = `
      <div class="admin-content-area">
        <h3>${view.toUpperCase()} Management</h3>
        <p>Management interface for ${view} is active.</p>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="admin-wrapper">
      <aside class="admin-sidebar" id="admin-sidebar">
        <div class="sidebar-header">OMEGA ADMIN</div>
        <ul class="sidebar-menu">
          <li><a onclick="renderAdminDashboard('home')" class="${view === 'home' ? 'active' : ''}"><i class="fa-solid fa-chart-line"></i> Dashboard</a></li>
          <li><a onclick="renderAdminDashboard('dues-entry')" class="${view === 'dues-entry' ? 'active' : ''}"><i class="fa-solid fa-wallet"></i> Dues Entry</a></li>
          <li><a onclick="renderAdminDashboard('all')" class="${view === 'all' ? 'active' : ''}"><i class="fa-solid fa-users"></i> All Members View</a></li>
          <li><a onclick="renderAdminDashboard('men')" class="${view === 'men' ? 'active' : ''}"><i class="fa-solid fa-user-tie"></i> Men</a></li>
          <li><a onclick="renderAdminDashboard('women')" class="${view === 'women' ? 'active' : ''}"><i class="fa-solid fa-user-dress"></i> Women</a></li>
          <li><a onclick="renderAdminDashboard('youth')" class="${view === 'youth' ? 'active' : ''}"><i class="fa-solid fa-child"></i> Youth</a></li>
          <li><a onclick="renderAdminDashboard('workforce')" class="${view === 'workforce' ? 'active' : ''}"><i class="fa-solid fa-briefcase"></i> Workforce</a></li>
          <li><a onclick="renderAdminDashboard('offering')"><i class="fa-solid fa-hand-holding-dollar"></i> Offering</a></li>
          <li><a onclick="renderAdminDashboard('tithe')"><i class="fa-solid fa-coins"></i> Tithe</a></li>
          <li><a onclick="renderAdminDashboard('projects')"><i class="fa-solid fa-diagram-project"></i> Group Projects</a></li>
          <li><a onclick="renderAdminDashboard('church-expenses')"><i class="fa-solid fa-file-invoice-dollar"></i> Church Expenses</a></li>
          <li><a onclick="renderAdminDashboard('group-expenses')"><i class="fa-solid fa-receipt"></i> Group Expenses</a></li>
          <li><a onclick="renderAdminDashboard('settings')" class="${view === 'settings' ? 'active' : ''}"><i class="fa-solid fa-gear"></i> Settings</a></li>
          <li><a onclick="renderAuthSelection()"><i class="fa-solid fa-right-from-bracket"></i> Logout</a></li>
        </ul>
      </aside>

      <main class="admin-main">
        <header class="admin-topbar">
          <div class="topbar-left">
            <button class="toggle-btn" onclick="toggleSidebar()"><i class="fa-solid fa-bars"></i></button>
            <h3>Admin Portal</h3>
          </div>
          <div class="topbar-right">
            <div class="notification-bell">
              <i class="fa-solid fa-bell"></i>
              <span class="bell-badge">3</span>
            </div>
            <div class="admin-profile">
              <img src="https://via.placeholder.com/36" class="admin-avatar" alt="Admin" />
              <div class="admin-info">
                <span>Main Admin</span>
                <span class="admin-phone">+234 800 000 0000</span>
              </div>
            </div>
          </div>
        </header>

        ${mainContentHtml}
      </main>
    </div>
  `;
}

function toggleSidebar() {
  const sidebar = document.getElementById("admin-sidebar");
  sidebar.classList.toggle("open");
}

function toggleBackdateFields() {
  const mode = document.getElementById("dues-mode").value;
  const backdateFields = document.getElementById("backdate-fields");
  if (mode === "backdate") {
    backdateFields.classList.remove("hidden");
  } else {
    backdateFields.classList.add("hidden");
  }
}

function handleDuesEntry(e) {
  e.preventDefault();
  const phone = document.getElementById("dues-member-phone").value;
  const amount = parseFloat(document.getElementById("dues-amount").value);
  const mode = document.getElementById("dues-mode").value;
  const dateStr = mode === "backdate" ? document.getElementById("dues-backdate").value : new Date().toISOString().split('T')[0];

  if (!phone || isNaN(amount) || amount <= 0) {
    alert("Please fill in valid payment details!");
    return;
  }

  const payments = getDuesPayments();
  payments.push({
    id: "TXN-" + Date.now(),
    memberPhone: phone,
    amount: amount,
    mode: mode,
    paymentDate: dateStr,
    recordedBy: "Main Admin"
  });

  saveDuesPayments(payments);
  alert(`Payment of ₦${amount.toLocaleString()} recorded successfully!`);
  renderAdminDashboard("dues-entry");
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
  alert(`New dues rate of ₦${rate.toLocaleString()} set starting ${monthStr}! Existing arrears preserved.`);
  renderAdminDashboard("settings");
}

function previewSound(num) {
  alert(`Playing preview audio sample ${num}`);
}

function editMember(phone) {
  let users = getUsers();
  let user = users.find(u => u.phone === phone);
  if (!user) return;

  const newName = prompt("Edit Full Name:", user.fullName);
  if (newName === null) return;

  const newPhone = prompt("Edit Phone Number:", user.phone);
  if (newPhone === null) return;

  user.fullName = newName.trim();
  user.phone = newPhone.trim();

  saveUsers(users);
  alert("Member details updated successfully!");
  renderAdminDashboard('all');
}

function deleteMember(phone) {
  if (confirm("Are you sure you want to delete this member?")) {
    let users = getUsers();
    users = users.filter(u => u.phone !== phone);
    saveUsers(users);
    alert("Member deleted successfully.");
    renderAdminDashboard('all');
  }
}
