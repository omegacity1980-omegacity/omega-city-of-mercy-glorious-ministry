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

// Financial Ledger Engine Functions (Starting Jan 2026 - Oldest Unpaid First)
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
        label: `${monthName}${y}`,
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

  let advanceDues = remainingPool;
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

function calculateMemberProjects(phone) {
  const projects = getFinancialRecords("omega_projects").filter(p => p.memberPhone === phone);
  return projects.reduce((sum, p) => sum + Number(p.amount), 0);
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
        
        <a href="data:text/html;charset=utf-8,${encodeURIComponent('<h1>OMEGA CITY OF MERCY - MEMBER PORTAL</h1><p>Offline Installer Access</p>')}" download="Member_Portal.html" class="download-link">
          <i class="fa-solid fa-download"></i> Download Member Login Page
        </a>
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
  const totalProjectsPaid = calculateMemberProjects(user.phone);
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
          <h2>${groupTitle}${user.isWorker ? '<span class="workforce-badge">| Workforce</span>' : ''}</h2>
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
            <p>₦${totalProjectsPaid.toLocaleString()}</p>
          </div>
        </div>

        <div class="admin-content-area" style="padding: 0; margin-bottom: 20px;">
          <h3 style="font-size:0.95rem;">Monthly Dues Breakdown (Jan 2026 - Present)</h3>
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
          <i class="fa-solid fa-lock"></i> Financial records are read-only for members. Transparency is maintained.
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
        <input type="file" id="
