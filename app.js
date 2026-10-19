document.addEventListener("DOMContentLoaded", () => {
  initDuesConfig();

  // 6-Second Splash / Loading Screen Timer
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
  }, 6000);
});

// Database Helpers
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
  return {
    total: projects.reduce((sum, p) => sum + Number(p.amount), 0),
    list: projects
  };
}

function calculateGroupFinancials(groupKey) {
  const users = getUsers();
  let groupMembers = groupKey === "workforce" ? users.filter(u => u.isWorker) : users.filter(u => u.group === groupKey);

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
    .filter(e => e.group === groupKey)
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

// Authentication Selection
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
  routeUserDashboard(user, 'home');
}

// MEMBER REGISTRATION FUNNEL - STEP 1
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

function handleRegStep1(e) {
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

  const users = getUsers();
  if (users.some(u => u.phone === tempRegData.phone)) {
    alert("This phone number is already registered!");
    return;
  }

  renderRegistrationStep2();
}

// MEMBER REGISTRATION FUNNEL - STEP 2
function renderRegistrationStep2() {
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
            <option value="Technical">Technical</option>
            <option value="Security">Security</option>
            <option value="Choir">Choir</option>
            <option value="Usher">Usher</option>
            <option value="Children class">Children class</option>
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

// MEMBER REGISTRATION FUNNEL - STEP 3
function renderRegistrationStep3() {
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

  reader.onload = function(event) {
    tempRegData.profilePic = event.target.result;
    tempRegData.pin = pin;

    const users = getUsers();
    users.push(tempRegData);
    saveUsers(users);

    alert("Registration saved successfully! Please log in.");
    renderLogin();
  };

  if (fileInput.files[0]) {
    reader.readAsDataURL(fileInput.files[0]);
  } else {
    tempRegData.profilePic = "";
    tempRegData.pin = pin;
    const users = getUsers();
    users.push(tempRegData);
    saveUsers(users);

    alert("Registration saved successfully! Please log in.");
    renderLogin();
  }
}

// MEMBER DASHBOARD ROUTING
function routeUserDashboard(user, view = 'home') {
  const container = document.getElementById("view-container");
  let groupTitle = `${user.group.toUpperCase()} FELLOWSHIP`;

  const financials = calculateMemberDues(user.phone);
  const projectsData = calculateMemberProjects(user.phone);
  const currentMonthRate = getRateForMonth(new Date().getFullYear(), new Date().getMonth());

  const userNotifications = getFinancialRecords(`omega_notifications_${user.phone}`);
  const userAttendance = getFinancialRecords(`omega_attendance_${user.phone}`);

  let mainBodyContent = "";

  if (view === 'home') {
    mainBodyContent = `
      <div class="welcome-banner">
        <h2>${groupTitle} DASHBOARD ${user.isWorker ? `<span class="workforce-badge">| ${user.department ? user.department.toUpperCase() : 'Workforce'}</span>` : ''}</h2>
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
        <div class="m-card" onclick="routeUserDashboard(getUsers().find(u=>u.phone==='${user.phone}'), 'attendance')" style="cursor:pointer; border:1px solid var(--gold-primary);">
          <h4><i class="fa-solid fa-calendar-check"></i> Attendance Record</h4>
          <p style="font-size:1.1rem; color:var(--success);">${userAttendance.length} Services Attended</p>
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
      <div class="settings-card" onclick="viewNotificationDetail(${i}, '${user.phone}')" style="cursor:pointer;">
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
  } else if (view === 'exco-role') {
    mainBodyContent = renderExcoPortalView(user);
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

  const isLeader = user.isGroupLeader;
  const isExco = user.excoRole;

  container.innerHTML = `
    <div class="member-dashboard-wrapper">
      <header class="member-topbar">
        <div class="topbar-left">
          <button class="toggle-btn-topleft" onclick="toggleMemberSidebar()">
            <i class="fa-solid fa-bars"></i> Menu
          </button>
          <div class="member-profile-section">
            <img src="${user.profilePic || 'https://via.placeholder.com/45'}" class="member-avatar-img" />
            <div>
              <h4 style="font-size:0.85rem;">${user.fullName}</h4>
              <span class="member-id-tag">ID: OCM-${user.phone.slice(-4)}</span>
            </div>
          </div>
        </div>
        <div class="member-topbar-right">
          ${isLeader ? `<button class="btn-group-admin" onclick="openGroupLeaderPinModal('${user.phone}')"><i class="fa-solid fa-user-shield"></i> Group Admin</button>` : ''}
          <div class="notification-bell" onclick="routeUserDashboard(getUsers().find(u=>u.phone==='${user.phone}'), 'notifications')">
            <i class="fa-solid fa-bell"></i>
            <span class="bell-badge">${userNotifications.length}</span>
          </div>
          <button onclick="logout()" class="btn-logout"><i class="fa-solid fa-right-from-bracket"></i></button>
        </div>
      </header>

      <div class="member-content">
        ${mainBodyContent}
        <div class="read-only-notice">
          <i class="fa-solid fa-lock"></i> Financial records are read-only for members.
        </div>
      </div>

      <aside class="member-sidebar" id="member-sidebar">
        <div class="sidebar-header">
          <span>${user.group.toUpperCase()} MENU</span>
          <button class="close-sidebar-btn" onclick="toggleMemberSidebar()"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <ul class="sidebar-menu">
          <li><a onclick="routeUserDashboard(getUsers().find(u=>u.phone==='${user.phone}'), 'home'); toggleMemberSidebar();" class="${view === 'home' ? 'active' : ''}"><i class="fa-solid fa-house"></i> Dashboard</a></li>
          <li><a onclick="routeUserDashboard(getUsers().find(u=>u.phone==='${user.phone}'), 'dues-history'); toggleMemberSidebar();" class="${view === 'dues-history' ? 'active' : ''}"><i class="fa-solid fa-clock-rotate-left"></i> View My Dues History</a></li>
          <li><a onclick="routeUserDashboard(getUsers().find(u=>u.phone==='${user.phone}'), 'project-levy'); toggleMemberSidebar();" class="${view === 'project-levy' ? 'active' : ''}"><i class="fa-solid fa-diagram-project"></i> View Project Levy</a></li>
          <li><a onclick="routeUserDashboard(getUsers().find(u=>u.phone==='${user.phone}'), 'attendance'); toggleMemberSidebar();" class="${view === 'attendance' ? 'active' : ''}"><i class="fa-solid fa-calendar-check"></i> Attendance Record</a></li>
          <li><a onclick="routeUserDashboard(getUsers().find(u=>u.phone==='${user.phone}'), 'notifications'); toggleMemberSidebar();" class="${view === 'notifications' ? 'active' : ''}"><i class="fa-solid fa-bell"></i> Notifications (${userNotifications.length})</a></li>
          
          ${isExco ? `
            <li>
              <a onclick="routeUserDashboard(getUsers().find(u=>u.phone==='${user.phone}'), 'exco-role'); toggleMemberSidebar();" class="${view === 'exco-role' ? 'active' : ''}" style="color:var(--gold-primary);">
                <i class="fa-solid fa-user-gear"></i> My Exco Portal (${user.excoRole})
              </a>
            </li>
          ` : ''}

          <li><a onclick="routeUserDashboard(getUsers().find(u=>u.phone==='${user.phone}'), 'settings'); toggleMemberSidebar();" class="${view === 'settings' ? 'active' : ''}"><i class="fa-solid fa-gear"></i> Settings</a></li>
          <li><a onclick="logout()"><i class="fa-solid fa-right-from-bracket"></i> Logout</a></li>
        </ul>
      </aside>
    </div>
  `;
}

// GROUP LEADER LOGIN & NEW PIN SETUP
function openGroupLeaderPinModal(phone) {
  const leader = getUsers().find(u => u.phone === phone);

  if (leader.hasCustomLeaderPin) {
    const pin = prompt("Enter your 7-Digit Group Admin PIN:");
    if (pin === leader.leaderPin) {
      renderGroupLeaderDashboard(leader, 'members');
    } else if (pin !== null) {
      alert("Incorrect 7-Digit PIN!");
    }
    return;
  }

  const tempPin = prompt("Enter the 7-Digit PIN sent to your notifications:");
  if (tempPin === leader.tempLeaderPin) {
    const modalHtml = `
      <div class="modal-overlay" id="pin-reset-modal">
        <div class="modal-content">
          <div class="modal-header">
            <h3>Set Your New 7-Digit Group Admin PIN</h3>
          </div>
          <form onsubmit="handleLeaderPinReset(event, '${phone}')">
            <label>Enter New 7-Digit PIN</label>
            <input type="password" id="new-leader-pin" maxlength="7" minlength="7" required placeholder="*******" />

            <label>Confirm New 7-Digit PIN</label>
            <input type="password" id="confirm-leader-pin" maxlength="7" minlength="7" required placeholder="*******" />

            <button type="submit" class="btn-primary">Save New PIN & Continue</button>
          </form>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  } else if (tempPin !== null) {
    alert("Incorrect Temporary PIN!");
  }
}

function handleLeaderPinReset(e, phone) {
  e.preventDefault();
  const p1 = document.getElementById("new-leader-pin").value.trim();
  const p2 = document.getElementById("confirm-leader-pin").value.trim();

  if (p1 !== p2) {
    alert("PINs do not match!");
    return;
  }
  if (p1.length !== 7 || isNaN(p1)) {
    alert("PIN must be exactly 7 digits!");
    return;
  }

  let users = getUsers();
  let leader = users.find(u => u.phone === phone);
  if (leader) {
    leader.leaderPin = p1;
    delete leader.tempLeaderPin;
    leader.hasCustomLeaderPin = true;
    saveUsers(users);

    document.getElementById("pin-reset-modal").remove();
    alert("New 7-Digit PIN created successfully! Temporary PIN is now invalidated.");
    renderGroupLeaderDashboard(leader, 'members');
  }
}

// GROUP LEADER DASHBOARD
function renderGroupLeaderDashboard(leader, view = 'members') {
  const container = document.getElementById("view-container");
  const users = getUsers().filter(u => u.group === leader.group);

  let leaderContentHtml = "";

  if (view === 'members') {
    leaderContentHtml = `
      <div class="admin-content-area" style="padding:0;">
        <h3>${leader.group.toUpperCase()} Fellowship Members</h3>
        <div class="settings-card">
          <input type="text" id="leader-member-search" placeholder="Search members in ${leader.group.toUpperCase()}..." oninput="filterGroupMembersTable('${leader.group}')" />
        </div>

        <div id="group-members-table-container">
          ${generateGroupMembersTable(users)}
        </div>
      </div>
    `;
  } else if (view === 'assign-excos') {
    const existingExcos = users.filter(u => u.excoRole);

    leaderContentHtml = `
      <div class="admin-content-area" style="padding:0;">
        <h3>Assign Fellowship Executive (Excos)</h3>
        
        <div class="settings-card">
          <form onsubmit="handleAssignExcoByLeader(event, '${leader.phone}')">
            <label>Search & Select Member</label>
            <select id="leader-exco-member" required>
              <option value="">-- Select Member --</option>
              ${users.map(u => `<option value="${u.phone}">${u.fullName} (${u.phone})</option>`).join('')}
            </select>

            <label>Assign Exco Role</label>
            <select id="leader-exco-role" required>
              <option value="">-- Select Role --</option>
              <option value="Dues Collector">Dues Collector</option>
              <option value="Levy Collector">Levy Collector</option>
              <option value="Post Levy">Post Levy</option>
              <option value="Record Levy Paid">Record Levy Paid</option>
              <option value="Attendance Taker">Attendance Taker</option>
            </select>

            <button type="submit" class="btn-primary">Appoint Exco</button>
          </form>
        </div>

        <h3>Currently Appointed Excos</h3>
        <table class="members-table">
          <thead>
            <tr>
              <th>Member Name</th>
              <th>Phone</th>
              <th>Assigned Role</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${existingExcos.map(e => `
              <tr>
                <td>${e.fullName}</td>
                <td>${e.phone}</td>
                <td><span class="badge paid">${e.excoRole}</span></td>
                <td><button onclick="removeExcoRole('${e.phone}', '${leader.phone}')" class="btn-sm-danger">Remove</button></td>
              </tr>
            `).join('') || '<tr><td colspan="4" style="text-align:center;">No excos assigned yet.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="admin-wrapper">
      <main class="admin-main">
        <header class="admin-topbar">
          <div class="topbar-left">
            <button class="toggle-btn-topleft" onclick="toggleLeaderSidebar()">
              <i class="fa-solid fa-bars"></i> Menu
            </button>
            <h3>${leader.group.toUpperCase()} LEADER PORTAL</h3>
          </div>
          <div class="topbar-right">
            <button onclick="routeUserDashboard(getUsers().find(u=>u.phone==='${leader.phone}'), 'home')" class="btn-logout"><i class="fa-solid fa-xmark"></i></button>
          </div>
        </header>

        <div style="padding:20px;">
          ${leaderContentHtml}
        </div>
      </main>

      <aside class="admin-sidebar" id="leader-sidebar">
        <div class="sidebar-header">
          <span>LEADER MENU</span>
          <button class="close-sidebar-btn" onclick="toggleLeaderSidebar()"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <ul class="sidebar-menu">
          <li><a onclick="renderGroupLeaderDashboard(getUsers().find(u=>u.phone==='${leader.phone}'), 'members'); toggleLeaderSidebar();" class="${view === 'members' ? 'active' : ''}"><i class="fa-solid fa-users"></i> View Members</a></li>
          <li><a onclick="renderGroupLeaderDashboard(getUsers().find(u=>u.phone==='${leader.phone}'), 'assign-excos'); toggleLeaderSidebar();" class="${view === 'assign-excos' ? 'active' : ''}"><i class="fa-solid fa-user-plus"></i> Assign Excos</a></li>
          <li><a onclick="routeUserDashboard(getUsers().find(u=>u.phone==='${leader.phone}'), 'home')"><i class="fa-solid fa-arrow-left"></i> Exit Leader Portal</a></li>
        </ul>
      </aside>
    </div>
  `;
}

function generateGroupMembersTable(usersList) {
  return `
    <table class="members-table">
      <thead>
        <tr>
          <th>S/N</th>
          <th>Full Name</th>
          <th>Phone</th>
          <th>WhatsApp</th>
          <th>Exco Role</th>
        </tr>
      </thead>
      <tbody>
        ${usersList.map((u, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${u.fullName}</td>
            <td>${u.phone}</td>
            <td>${u.whatsapp || u.phone}</td>
            <td>${u.excoRole ? `<span class="badge paid">${u.excoRole}</span>` : 'Member'}</td>
          </tr>
        `).join('') || '<tr><td colspan="5" style="text-align:center;">No members found.</td></tr>'}
      </tbody>
    </table>
  `;
}

function filterGroupMembersTable(groupKey) {
  const query = document.getElementById("leader-member-search").value.toLowerCase();
  const users = getUsers().filter(u => u.group === groupKey && u.fullName.toLowerCase().includes(query));
  document.getElementById("group-members-table-container").innerHTML = generateGroupMembersTable(users);
}

function toggleLeaderSidebar() {
  const sidebar = document.getElementById("leader-sidebar");
  sidebar.classList.toggle("open");
}

function handleAssignExcoByLeader(e, leaderPhone) {
  e.preventDefault();
  const targetPhone = document.getElementById("leader-exco-member").value;
  const roleName = document.getElementById("leader-exco-role").value;

  let users = getUsers();
  let member = users.find(u => u.phone === targetPhone);

  if (member) {
    member.excoRole = roleName;
    saveUsers(users);
    alert(`${member.fullName} appointed as ${roleName}!`);
    renderGroupLeaderDashboard(users.find(u => u.phone === leaderPhone), 'assign-excos');
  }
}

function removeExcoRole(phone, leaderPhone) {
  let users = getUsers();
  let member = users.find(u => u.phone === phone);
  if (member) {
    delete member.excoRole;
    saveUsers(users);
    alert("Exco role removed.");
    renderGroupLeaderDashboard(users.find(u => u.phone === leaderPhone), 'assign-excos');
  }
}

// EXCO SPECIFIC PORTAL VIEW
function renderExcoPortalView(user) {
  const role = user.excoRole;

  if (role === "Dues Collector" || role === "Record Levy Paid" || role === "Post Levy") {
    return `
      <div class="admin-content-area" style="padding:0;">
        <h3>Exco Portal - ${role}</h3>
        <div class="settings-card">
          <form onsubmit="handleExcoPaymentEntry(event, '${user.phone}', '${role}')">
            <label>Select Group Member</label>
            <select id="exco-entry-member" required>
              <option value="">-- Select Member --</option>
              ${getUsers().filter(u => u.group === user.group).map(u => `<option value="${u.phone}">${u.fullName} (${u.phone})</option>`).join('')}
            </select>

            <label>${role === "Dues Collector" ? 'Dues Amount (₦)' : 'Levy Amount (₦)'}</label>
            <input type="number" id="exco-entry-amount" required placeholder="5000" />

            <button type="submit" class="btn-primary">Record Payment</button>
          </form>
        </div>
      </div>
    `;
  } else if (role === "Attendance Taker") {
    return `
      <div class="admin-content-area" style="padding:0;">
        <h3>Exco Portal - Attendance Taker</h3>
        <div class="settings-card">
          <form onsubmit="handleExcoMarkAttendance(event, '${user.group}')">
            <label>Select Member</label>
            <select id="att-member-phone" required>
              <option value="">-- Select Member --</option>
              ${getUsers().filter(u => u.group === user.group).map(u => `<option value="${u.phone}">${u.fullName} (${u.phone})</option>`).join('')}
            </select>

            <label>Service Date</label>
            <input type="date" id="att-date" required />

            <button type="submit" class="btn-primary">Mark Member Present</button>
          </form>
        </div>
      </div>
    `;
  }
  return `<p>Role assigned: ${role}</p>`;
}

function handleExcoPaymentEntry(e, excoPhone, role) {
  e.preventDefault();
  const phone = document.getElementById("exco-entry-member").value;
  const amount = parseFloat(document.getElementById("exco-entry-amount").value);

  if (role === "Dues Collector") {
    const payments = getFinancialRecords("omega_dues_payments");
    payments.push({
      id: "TXN-" + Date.now(),
      memberPhone: phone,
      amount: amount,
      paymentDate: new Date().toISOString().split('T')[0],
      recordedBy: excoPhone
    });
    saveFinancialRecords("omega_dues_payments", payments);
  } else {
    const projects = getFinancialRecords("omega_projects");
    const member = getUsers().find(u => u.phone === phone);
    projects.push({
      memberPhone: phone,
      memberName: member ? member.fullName : "Unknown",
      projectName: "Group Levy",
      amount: amount,
      date: new Date().toISOString().split('T')[0]
    });
    saveFinancialRecords("omega_projects", projects);
  }

  alert("Payment recorded successfully!");
}

function handleExcoMarkAttendance(e, group) {
  e.preventDefault();
  const phone = document.getElementById("att-member-phone").value;
  const date = document.getElementById("att-date").value;

  const records = getFinancialRecords(`omega_attendance_${phone}`);
  records.push({ date, serviceName: "Sunday Service" });
  saveFinancialRecords(`omega_attendance_${phone}`, records);

  alert("Attendance marked successfully!");
}

function viewNotificationDetail(index, phone) {
  const records = getFinancialRecords(`omega_notifications_${phone}`);
  const notif = records[index];
  if (!notif) return;

  const modalHtml = `
    <div class="modal-overlay" id="notif-modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>${notif.title}</h3>
          <button onclick="document.getElementById('notif-modal').remove()" class="close-sidebar-btn"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <p style="font-size:0.75rem; color:var(--text-muted); margin-bottom:10px;">${notif.date}</p>
        <p style="font-size:0.9rem; line-height:1.4;">${notif.message}</p>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function toggleMemberSidebar() {
  const sidebar = document.getElementById("member-sidebar");
  sidebar.classList.toggle("open");
}

function logout() {
  localStorage.removeItem("omega_current_user");
  renderAuthSelection();
}

// MAIN ADMIN LOGIN & DASHBOARD
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

// FULL ADMIN DASHBOARD WITH COMPLETE SIDEBAR NAVIGATION
function renderAdminDashboard(view = "home") {
  const container = document.getElementById("view-container");
  let mainContentHtml = "";

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
            <h4>TOTAL GROUP DUES</h4>
            <p style="color: var(--gold-primary);">₦${totalDues.toLocaleString()}</p>
          </div>
          <div class="summary-card">
            <h4>TOTAL GROUP INFLOW</h4>
            <p style="color: var(--success);">₦${totalInflow.toLocaleString()}</p>
          </div>
          <div class="summary-card">
            <h4>TOTAL GROUP HANDOVER</h4>
            <p style="color: #a855f7;">₦${totalHandover.toLocaleString()}</p>
          </div>
          <div class="summary-card">
            <h4>TOTAL GROUP EXPENSES</h4>
            <p style="color: var(--danger);">₦${totalGroupExpenses.toLocaleString()}</p>
          </div>
        </div>
      </section>
    `;
  } else if (["men", "women", "youth", "workforce"].includes(view)) {
    const fin = calculateGroupFinancials(view);
    const titleName = view.toUpperCase() + (view === 'workforce' ? '' : ' FELLOWSHIP');

    let rows = fin.members.map((u, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${u.fullName}</td>
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

        <div class="admin-cards-grid-2x2">
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
          <div class="summary-card">
            <h4>DUES ARREARS</h4>
            <p style="color: var(--danger);">₦${fin.duesArrears.toLocaleString()}</p>
          </div>
          <div class="summary-card">
            <h4>TOTAL LEVY ARREARS</h4>
            <p style="color: var(--danger);">₦${fin.totalLevyArrears.toLocaleString()}</p>
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
  } else if (view === "leaders") {
    const users = getUsers();
    const groups = ["men", "women", "youth"];

    let leadersGridHtml = groups.map(grpKey => {
      let leader = users.find(u => u.group === grpKey && u.isGroupLeader);
      let excos = users.filter(u => u.group === grpKey && u.excoRole);

      return `
        <div class="leader-card">
          <h3>${grpKey.toUpperCase()} FELLOWSHIP</h3>
          ${leader ? `
            <div class="leader-info-item"><strong>Leader:</strong> ${leader.fullName}</div>
            <div class="leader-info-item"><strong>Phone:</strong> ${leader.phone}</div>
            <div class="leader-info-item"><strong>WhatsApp:</strong> ${leader.whatsapp || leader.phone}</div>
          ` : `<p style="font-size:0.8rem; color:var(--danger);">No Group Leader appointed yet.</p>`}

          <div class="exco-list">
            <h4 style="font-size:0.75rem; color:var(--gold-primary);">ASSIGNED GROUP EXCOS:</h4>
            ${excos.map(e => `
              <div class="exco-item">• <strong>${e.fullName}</strong> (${e.excoRole}) -${e.phone}</div>
            `).join('') || '<p style="font-size:0.7rem; color:var(--text-muted);">No excos assigned.</p>'}
          </div>
        </div>
      `;
    }).join('');

    mainContentHtml = `
      <div class="admin-content-area">
        <h3>Assign Group Leaders</h3>
        <div class="settings-card">
          <form onsubmit="handleAppointGroupLeader(event)">
            <label>1. Select Group</label>
            <select id="leader-group-select" onchange="filterMembersBySelectedGroup(this.value)" required>
              <option value="">-- Select Group --</option>
              <option value="men">Men Fellowship</option>
              <option value="women">Women Fellowship</option>
              <option value="youth">Youth Fellowship</option>
            </select>

            <label>2. Search & Select Group Member</label>
            <select id="leader-member-select" required>
              <option value="">-- Select Group First --</option>
            </select>

            <label>3. Assign 7-Digit Leader PIN</label>
            <input type="password" id="leader-7digit-pin" maxlength="7" minlength="7" placeholder="*******" required />

            <button type="submit" class="btn-primary">Appoint Group Leader & Save PIN</button>
          </form>
        </div>

        <h3>Group Leaders & Executive Overview</h3>
        <div class="two-col-grid">
          ${leadersGridHtml}
        </div>
      </div>
    `;
  } else if (["all", "dept-sanitation", "dept-technical", "dept-security", "dept-choir", "dept-usher", "dept-children"].includes(view)) {
    const users = getUsers();
    let filteredUsers = users;

    if (view === "dept-sanitation") filteredUsers = users.filter(u => u.department === "Sanitation");
    else if (view === "dept-technical") filteredUsers = users.filter(u => u.department === "Technical");
    else if (view === "dept-security") filteredUsers = users.filter(u => u.department === "Security");
    else if (view === "dept-choir") filteredUsers = users.filter(u => u.department === "Choir");
    else if (view === "dept-usher") filteredUsers = users.filter(u => u.department === "Usher");
    else if (view === "dept-children") filteredUsers = users.filter(u => u.department === "Children class");

    let rows = filteredUsers.map((u, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${u.fullName}</td>
        <td>${u.phone}</td>
        <td>${u.group.toUpperCase()}</td>
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
        <h3>${view.toUpperCase().replace('DEPT-', 'DEPARTMENT: ')} View</h3>
        <table class="members-table">
          <thead>
            <tr>
              <th>S/N</th>
              <th>Full Name</th>
              <th>Phone</th>
              <th>Group</th>
              <th>Department / Worker</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="6" style="text-align:center;">No records found.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  } else if (view === "group-expenses") {
    const records = getFinancialRecords("omega_group_expenses");

    let rows = records.map((r, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${r.date}</td>
        <td>${r.group.toUpperCase()}</td>
        <td>${r.title}</td>
        <td>₦${Number(r.amount).toLocaleString()}</td>
      </tr>
    `).join("");

    mainContentHtml = `
      <div class="admin-content-area">
        <h3>Record Group Expense</h3>
        <div class="settings-card">
          <form onsubmit="handleGroupExpenseEntry(event)">
            <label>Select Fellowship / Group</label>
            <select id="grp-exp-group" required>
              <option value="men">Men Fellowship</option>
              <option value="women">Women Fellowship</option>
              <option value="youth">Youth Fellowship</option>
              <option value="workforce">Workforce</option>
            </select>

            <label>Expense Description</label>
            <input type="text" id="grp-exp-title" placeholder="e.g. Welfare / Event Setup" required />

            <label>Amount (₦)</label>
            <input type="number" id="grp-exp-amount" min="1" required placeholder="5000" />

            <label>Date</label>
            <input type="date" id="grp-exp-date" required />

            <button type="submit" class="btn-primary">Record Group Expense</button>
          </form>
        </div>

        <h3>Group Expense History</h3>
        <table class="members-table">
          <thead>
            <tr>
              <th>S/N</th>
              <th>Date</th>
              <th>Group</th>
              <th>Description</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="5" style="text-align:center;">No group expenses recorded.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  } else if (view === "dues-entry") {
    const users = getUsers();
    let memberOptions = users.map(u => `<option value="${u.phone}">${u.fullName} (${u.phone})</option>`).join("");

    mainContentHtml = `
      <div class="admin-content-area">
        <h3>Record Member Dues Payment</h3>
        <div class="settings-card">
          <form onsubmit="handleDuesEntry(event)">
            <label>Select Member</label>
            <select id="dues-member-phone" required>
              <option value="">-- Select Member --</option>
              ${memberOptions}
            </select>

            <label>Amount Paid (₦)</label>
            <input type="number" id="dues-amount" min="1" required placeholder="e.g. 1000" />

            <label>Payment Mode</label>
            <select id="dues-mode" onchange="toggleBackdateFields()" required>
              <option value="current">Current (Clear Oldest Arrears First)</option>
              <option value="backdate">Backdate Specific Month</option>
            </select>

            <div id="backdate-fields" class="hidden">
              <label>Historical Month Date</label>
              <input type="date" id="dues-backdate" />
            </div>

            <button type="submit" class="btn-primary">Record Dues Payment</button>
          </form>
        </div>
      </div>
    `;
  } else if (view === "projects") {
    const users = getUsers();
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
            <input type="text" id="proj-title" placeholder="e.g. Building Project / Men Annual Levy" required />

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
    const users = getUsers();
    let userOptions = users.map(u => `<option value="${u.phone}">${u.fullName} (${u.phone})</option>`).join("");

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

        <div class="settings-card">
          <h4><i class="fa-solid fa-palette"></i> Change Theme</h4>
          <select onchange="changeTheme(this.value)">
            <option value="dark">Professional Dark Gold (Default)</option>
            <option value="light">Professional Light</option>
          </select>
        </div>

        <div class="settings-card">
          <h4><i class="fa-solid fa-key"></i> Reset Member / Leader / Exco PIN</h4>
          <form onsubmit="handleResetPin(event)">
            <label>Select User</label>
            <select id="reset-user-phone" required>
              <option value="">-- Select User --</option>
              ${userOptions}
            </select>
            <label>New PIN</label>
            <input type="password" id="reset-new-pin" placeholder="Enter new PIN" required />
            <button type="submit" class="btn-primary">Update PIN</button>
          </form>
        </div>
      </div>
    `;
  } else if (["tithe", "offering", "church-expenses"].includes(view)) {
    const recordKey = view === "tithe" ? "omega_tithes" : view === "offering" ? "omega_offerings" : "omega_expenses";
    const currentRecords = getFinancialRecords(recordKey);

    let rows = currentRecords.map((r, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${r.date}</td>
        <td>${r.title || r.member || 'General'}</td>
        <td>₦${Number(r.amount).toLocaleString()}</td>
      </tr>
    `).join("");

    mainContentHtml = `
      <div class="admin-content-area">
        <h3>Record New ${view.toUpperCase()}</h3>
        <form onsubmit="addFinancialEntry(event, '${recordKey}', '${view}')" style="margin-bottom: 20px;">
          <input type="text" id="fin-title" placeholder="Description / Member Name" required />
          <input type="number" id="fin-amount" placeholder="Amount (₦)" required />
          <input type="date" id="fin-date" required />
          <button type="submit" class="btn-primary">Add ${view.toUpperCase()}</button>
        </form>

        <h3>${view.toUpperCase()} Records History</h3>
        <table class="members-table">
          <thead>
            <tr>
              <th>S/N</th>
              <th>Date</th>
              <th>Description / Member</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="4" style="text-align:center;">No records found.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  }

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
          <div class="topbar-right">
            <div class="notification-bell">
              <i class="fa-solid fa-bell"></i>
              <span class="bell-badge">3</span>
            </div>
            <div class="admin-profile">
              <img src="https://via.placeholder.com/36" class="admin-avatar" alt="Admin" />
              <div class="admin-info">
                <span>Main Admin</span>
              </div>
            </div>
          </div>
        </header>

        ${mainContentHtml}
      </main>

      <aside class="admin-sidebar" id="admin-sidebar">
        <div class="sidebar-header">
          <span>NAVIGATION</span>
          <button class="close-sidebar-btn" onclick="toggleSidebar()"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <ul class="sidebar-menu">
          <li><a onclick="renderAdminDashboard('home'); toggleSidebar();" class="${view === 'home' ? 'active' : ''}"><i class="fa-solid fa-chart-line"></i> Dashboard</a></li>
          <li><a onclick="renderAdminDashboard('leaders'); toggleSidebar();" class="${view === 'leaders' ? 'active' : ''}"><i class="fa-solid fa-user-shield"></i> Assign Group Leaders</a></li>
          <li><a onclick="renderAdminDashboard('dues-entry'); toggleSidebar();" class="${view === 'dues-entry' ? 'active' : ''}"><i class="fa-solid fa-wallet"></i> Dues Entry</a></li>
          <li><a onclick="renderAdminDashboard('projects'); toggleSidebar();" class="${view === 'projects' ? 'active' : ''}"><i class="fa-solid fa-diagram-project"></i> Group Projects</a></li>
          <li><a onclick="renderAdminDashboard('men'); toggleSidebar();" class="${view === 'men' ? 'active' : ''}"><i class="fa-solid fa-user-tie"></i> Men Fellowship</a></li>
          <li><a onclick="renderAdminDashboard('women'); toggleSidebar();" class="${view === 'women' ? 'active' : ''}"><i class="fa-solid fa-user-dress"></i> Women Fellowship</a></li>
          <li><a onclick="renderAdminDashboard('youth'); toggleSidebar();" class="${view === 'youth' ? 'active' : ''}"><i class="fa-solid fa-child"></i> Youth Fellowship</a></li>
          
          <!-- Workforce & Departments -->
          <li><a onclick="renderAdminDashboard('workforce'); toggleSidebar();" class="${view === 'workforce' ? 'active' : ''}"><i class="fa-solid fa-briefcase"></i> Workforce (All)</a></li>
          <li><a onclick="renderAdminDashboard('dept-sanitation'); toggleSidebar();" class="sub-menu-item ${view === 'dept-sanitation' ? 'active' : ''}"><i class="fa-solid fa-broom"></i> Sanitation</a></li>
          <li><a onclick="renderAdminDashboard('dept-technical'); toggleSidebar();" class="sub-menu-item ${view === 'dept-technical' ? 'active' : ''}"><i class="fa-solid fa-gears"></i> Technical</a></li>
          <li><a onclick="renderAdminDashboard('dept-security'); toggleSidebar();" class="sub-menu-item ${view === 'dept-security' ? 'active' : ''}"><i class="fa-solid fa-shield-halved"></i> Security</a></li>
          <li><a onclick="renderAdminDashboard('dept-choir'); toggleSidebar();" class="sub-menu-item ${view === 'dept-choir' ? 'active' : ''}"><i class="fa-solid fa-music"></i> Choir</a></li>
          <li><a onclick="renderAdminDashboard('dept-usher'); toggleSidebar();" class="sub-menu-item ${view === 'dept-usher' ? 'active' : ''}"><i class="fa-solid fa-user-check"></i> Usher</a></li>
          <li><a onclick="renderAdminDashboard('dept-children'); toggleSidebar();" class="sub-menu-item ${view === 'dept-children' ? 'active' : ''}"><i class="fa-solid fa-children"></i> Children class</a></li>

          <li><a onclick="renderAdminDashboard('tithe'); toggleSidebar();" class="${view === 'tithe' ? 'active' : ''}"><i class="fa-solid fa-coins"></i> Tithe</a></li>
          <li><a onclick="renderAdminDashboard('offering'); toggleSidebar();" class="${view === 'offering' ? 'active' : ''}"><i class="fa-solid fa-hand-holding-dollar"></i> Offering</a></li>
          <li><a onclick="renderAdminDashboard('church-expenses'); toggleSidebar();" class="${view === 'church-expenses' ? 'active' : ''}"><i class="fa-solid fa-file-invoice-dollar"></i> Church Expenses</a></li>
          <li><a onclick="renderAdminDashboard('group-expenses'); toggleSidebar();" class="${view === 'group-expenses' ? 'active' : ''}"><i class="fa-solid fa-receipt"></i> Group Expenses</a></li>
          <li><a onclick="renderAdminDashboard('all'); toggleSidebar();" class="${view === 'all' ? 'active' : ''}"><i class="fa-solid fa-users"></i> View All Members</a></li>
          <li><a onclick="renderAdminDashboard('settings'); toggleSidebar();" class="${view === 'settings' ? 'active' : ''}"><i class="fa-solid fa-gear"></i> Settings</a></li>
          <li><a onclick="renderAuthSelection()"><i class="fa-solid fa-right-from-bracket"></i> Logout</a></li>
        </ul>
      </aside>
    </div>
  `;
}

function filterMembersBySelectedGroup(groupKey) {
  const memberSelect = document.getElementById("leader-member-select");
  const users = getUsers().filter(u => u.group === groupKey);

  if (users.length === 0) {
    memberSelect.innerHTML = `<option value="">No members found in ${groupKey.toUpperCase()} fellowship</option>`;
  } else {
    memberSelect.innerHTML = `<option value="">-- Select Member --</option>` + 
      users.map(u => `<option value="${u.phone}">${u.fullName} (${u.phone})</option>`).join('');
  }
}

function handleAppointGroupLeader(e) {
  e.preventDefault();
  const groupKey = document.getElementById("leader-group-select").value;
  const phone = document.getElementById("leader-member-select").value;
  const tempPin = document.getElementById("leader-7digit-pin").value.trim();

  if (tempPin.length !== 7 || isNaN(tempPin)) {
    alert("Leader PIN must be exactly 7 numeric digits!");
    return;
  }

  let users = getUsers();

  users.forEach(u => {
    if (u.group === groupKey) u.isGroupLeader = false;
  });

  let leader = users.find(u => u.phone === phone);
  if (leader) {
    leader.isGroupLeader = true;
    leader.tempLeaderPin = tempPin;
    leader.hasCustomLeaderPin = false;
    saveUsers(users);

    // Send notification to member
    let userNotifs = getFinancialRecords(`omega_notifications_${phone}`);
    userNotifs.unshift({
      title: "Group Admin Appointment",
      message: `You have been appointed as the ${groupKey.toUpperCase()} Group Leader. Your temporary 7-Digit PIN is: ${tempPin}. Click 'Group Admin' button on your dashboard to complete setup.`,
      date: new Date().toLocaleString()
    });
    saveFinancialRecords(`omega_notifications_${phone}`, userNotifs);

    alert(`${leader.fullName} appointed as ${groupKey.toUpperCase()} Group Leader! Temporary 7-Digit PIN sent to member's notification.`);
    renderAdminDashboard("leaders");
  }
}

function handleGroupExpenseEntry(e) {
  e.preventDefault();
  const group = document.getElementById("grp-exp-group").value;
  const title = document.getElementById("grp-exp-title").value.trim();
  const amount = parseFloat(document.getElementById("grp-exp-amount").value);
  const date = document.getElementById("grp-exp-date").value;

  const records = getFinancialRecords("omega_group_expenses");
  records.push({ group, title, amount, date });

  saveFinancialRecords("omega_group_expenses", records);
  alert("Group expense recorded successfully!");
  renderAdminDashboard("group-expenses");
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

  const payments = getFinancialRecords("omega_dues_payments");
  payments.push({
    id: "TXN-" + Date.now(),
    memberPhone: phone,
    amount: amount,
    mode: mode,
    paymentDate: dateStr,
    recordedBy: "Main Admin"
  });

  saveFinancialRecords("omega_dues_payments", payments);
  alert(`Dues payment of ₦${amount.toLocaleString()} recorded successfully!`);
  renderAdminDashboard("dues-entry");
}

function handleProjectEntry(e) {
  e.preventDefault();
  const phone = document.getElementById("proj-member-phone").value;
  const projectName = document.getElementById("proj-title").value.trim();
  const amount = parseFloat(document.getElementById("proj-amount").value);
  const date = document.getElementById("proj-date").value;

  const users = getUsers();
  const user = users.find(u => u.phone === phone);

  const projects = getFinancialRecords("omega_projects");
  projects.push({
    memberPhone: phone,
    memberName: user ? user.fullName : "Unknown",
    projectName,
    amount,
    date
  });

  saveFinancialRecords("omega_projects", projects);
  alert("Project contribution recorded successfully!");
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

function addFinancialEntry(e, key, viewType) {
  e.preventDefault();
  const title = document.getElementById("fin-title").value.trim();
  const amount = document.getElementById("fin-amount").value.trim();
  const date = document.getElementById("fin-date").value;

  const records = getFinancialRecords(key);
  records.push({ title, amount, date });
  saveFinancialRecords(key, records);

  alert(`${viewType.toUpperCase()} record added successfully!`);
  renderAdminDashboard(viewType);
}

function changeTheme(theme) {
  const body = document.getElementById("app-body");
  if (theme === "light") {
    body.className = "theme-light";
  } else {
    body.className = "theme-dark";
  }
}

function handleResetPin(e) {
  e.preventDefault();
  const phone = document.getElementById("reset-user-phone").value;
  const newPin = document.getElementById("reset-new-pin").value.trim();

  let users = getUsers();
  let user = users.find(u => u.phone === phone);
  if (user) {
    user.pin = newPin;
    saveUsers(users);
    alert("PIN reset successfully!");
    renderAdminDashboard("settings");
  }
}

function toggleSidebar() {
  const sidebar = document.getElementById("admin-sidebar");
  sidebar.classList.toggle("open");
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
