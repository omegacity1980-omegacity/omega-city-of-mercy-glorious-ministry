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

// Financial Ledger Engine Functions
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
  routeUserDashboard(user, 'home');
}

// MEMBER DASHBOARD ROUTING
function routeUserDashboard(user, view = 'home') {
  const container = document.getElementById("view-container");
  let groupTitle = `${user.group.toUpperCase()} FELLOWSHIP`;

  const financials = calculateMemberDues(user.phone);
  const projectsData = calculateMemberProjects(user.phone);
  const currentMonthRate = getRateForMonth(new Date().getFullYear(), new Date().getMonth());

  const userNotifications = getFinancialRecords(`omega_notifications_${user.group}`);

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
      <div class="settings-card" onclick="viewNotificationDetail(${i}, '${user.group}')" style="cursor:pointer;">
        <h4 style="color:var(--gold-primary); margin-bottom:4px;">${n.title}</h4>
        <p style="font-size:0.75rem; color:var(--text-muted);">${n.date}</p>
        <p style="font-size:0.85rem; margin-top:6px;">${n.message.substring(0, 60)}...</p>
      </div>
    `).join('');

    mainBodyContent = `
      <div class="admin-content-area" style="padding: 0;">
        <h3>Group Broadcast Notifications</h3>
        ${listHtml || '<p style="color:var(--text-muted);">No notifications yet.</p>'}
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
        <div class="settings-card">
          <h4><i class="fa-solid fa-volume-high"></i> Notification Sound</h4>
          ${[1,2,3,4,5].map(i => `
            <div class="sound-item">
              <span>Notification Tone ${i}</span>
              <button class="btn-sm-edit" onclick="previewAudioSound(${i})"><i class="fa-solid fa-play"></i> Preview</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  const isLeader = user.isGroupLeader;

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
          ${isLeader ? `<button class="btn-group-leader-badge" onclick="promptLeaderPin('${user.phone}')"><i class="fa-solid fa-user-shield"></i> Group Leader</button>` : ''}
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
          <li><a onclick="routeUserDashboard(getUsers().find(u=>u.phone==='${user.phone}'), 'notifications'); toggleMemberSidebar();" class="${view === 'notifications' ? 'active' : ''}"><i class="fa-solid fa-bell"></i> Notifications (${userNotifications.length})</a></li>
          <li><a onclick="routeUserDashboard(getUsers().find(u=>u.phone==='${user.phone}'), 'settings'); toggleMemberSidebar();" class="${view === 'settings' ? 'active' : ''}"><i class="fa-solid fa-gear"></i> Settings</a></li>
          <li><a onclick="logout()"><i class="fa-solid fa-right-from-bracket"></i> Logout</a></li>
        </ul>
      </aside>
    </div>
  `;
}

function promptLeaderPin(phone) {
  const leader = getUsers().find(u => u.phone === phone);
  const pinEntered = prompt("Enter your 7-Digit Group Leader PIN:");
  if (pinEntered === leader.leaderPin) {
    renderGroupLeaderDashboard(leader, 'members');
  } else if (pinEntered !== null) {
    alert("Incorrect 7-Digit Group Leader PIN!");
  }
}

// GROUP LEADER DASHBOARD
function renderGroupLeaderDashboard(leader, view = 'members') {
  const container = document.getElementById("view-container");
  const users = getUsers().filter(u => u.group === leader.group);

  let leaderContentHtml = "";

  if (view === 'members') {
    let rows = users.map((u, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${u.fullName}</td>
        <td>${u.phone}</td>
        <td>${u.whatsapp || u.phone}</td>
        <td>${u.excoRole || 'Member'}</td>
      </tr>
    `).join("");

    leaderContentHtml = `
      <div class="admin-content-area" style="padding:0;">
        <h3>${leader.group.toUpperCase()} Fellowship Members</h3>
        <table class="members-table">
          <thead>
            <tr>
              <th>S/N</th>
              <th>Full Name</th>
              <th>Phone</th>
              <th>WhatsApp</th>
              <th>Assigned Exco Role</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  } else if (view === 'choose-excos') {
    const existingExcos = users.filter(u => u.excoRole);

    let memberOptions = users.map(u => `<option value="${u.phone}">${u.fullName} (${u.phone})</option>`).join('');

    leaderContentHtml = `
      <div class="admin-content-area" style="padding:0;">
        <h3>Assign Fellowship Executive (Exco) Roles (Max 6)</h3>
        <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:15px;">Currently assigned: ${existingExcos.length} / 6</p>
        
        <div class="settings-card">
          <form onsubmit="handleAssignExco(event, '${leader.phone}')">
            <label>Select Group Member</label>
            <select id="exco-member-phone" required>
              <option value="">-- Select Member --</option>
              ${memberOptions}
            </select>

            <label>Assign Exco Role</label>
            <input type="text" id="exco-role-name" placeholder="e.g. Vice Chairman, Secretary, Treasurer, Welfare" required />

            <button type="submit" class="btn-primary" ${existingExcos.length >= 6 ? 'disabled' : ''}>
              ${existingExcos.length >= 6 ? 'Maximum Excos Reached (6)' : 'Save Exco Role'}
            </button>
          </form>
        </div>

        <h3>Assigned Excos</h3>
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
                <td>${e.excoRole}</td>
                <td><button onclick="removeExcoRole('${e.phone}', '${leader.phone}')" class="btn-sm-danger">Remove</button></td>
              </tr>
            `).join('') || '<tr><td colspan="4" style="text-align:center;">No excos assigned yet.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  } else if (view === 'dues-records') {
    leaderContentHtml = `
      <div class="admin-content-area" style="padding:0;">
        <h3>Member Dues Lookup</h3>
        <div class="settings-card">
          <input type="text" id="leader-search-input" placeholder="Search member by name..." oninput="filterLeaderDuesSearch('${leader.group}')" />
          <label style="margin-top:10px;">Select Calendar Month</label>
          <input type="month" id="leader-month-filter" onchange="filterLeaderDuesSearch('${leader.group}')" />
        </div>

        <div id="leader-dues-results">
          ${generateLeaderDuesTable(users, leader.group)}
        </div>
      </div>
    `;
  } else if (view === 'projects') {
    const projects = getFinancialRecords("omega_projects");
    const groupProjects = projects.filter(p => users.some(u => u.phone === p.memberPhone));

    leaderContentHtml = `
      <div class="admin-content-area" style="padding:0;">
        <h3>Group Project Levy History</h3>
        <table class="members-table">
          <thead>
            <tr>
              <th>S/N</th>
              <th>Date</th>
              <th>Member</th>
              <th>Project Title</th>
              <th>Amount Paid</th>
            </tr>
          </thead>
          <tbody>
            ${groupProjects.map((p, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${p.date}</td>
                <td>${p.memberName}</td>
                <td>${p.projectName}</td>
                <td>₦${Number(p.amount).toLocaleString()}</td>
              </tr>
            `).join('') || '<tr><td colspan="5" style="text-align:center;">No project levy records.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  } else if (view === 'notifications') {
    leaderContentHtml = `
      <div class="admin-content-area" style="padding:0;">
        <h3>Send Broadcast Popup Notification to ${leader.group.toUpperCase()} Fellowship</h3>
        <div class="settings-card">
          <form onsubmit="handleSendGroupBroadcast(event, '${leader.group}')">
            <label>Heading Details / Title</label>
            <input type="text" id="notif-title" required placeholder="e.g. Monthly Fellowship Meeting Notice" />

            <label>Message Content</label>
            <textarea id="notif-msg" rows="4" required placeholder="Write message details..."></textarea>

            <label>Upload Picture (Optional)</label>
            <input type="file" id="notif-img" accept="image/*" />

            <button type="submit" class="btn-primary">Send Notification to Group</button>
          </form>
        </div>
      </div>
    `;
  } else if (view === 'money-info') {
    const handoverMoney = Number(localStorage.getItem(`omega_handover_${leader.group}`)) || 0;

    const duesPayments = getFinancialRecords("omega_dues_payments").filter(p => users.some(u => u.phone === p.memberPhone));
    const totalDues = duesPayments.reduce((s, p) => s + Number(p.amount), 0);

    const projects = getFinancialRecords("omega_projects").filter(p => users.some(u => u.phone === p.memberPhone));
    const paidProjectLevy = projects.reduce((s, p) => s + Number(p.amount), 0);

    const groupExpenses = getFinancialRecords("omega_group_expenses").filter(e => e.group === leader.group);
    const totalExpenses = groupExpenses.reduce((s, e) => s + Number(e.amount), 0);

    // Formula: Handover Money + Total Dues + Paid Project Levy - Total Expenses = Total Balance
    const totalBalance = handoverMoney + totalDues + paidProjectLevy - totalExpenses;

    let totalArrears = 0;
    users.forEach(u => {
      let calc = calculateMemberDues(u.phone);
      totalArrears += calc.amountOwing;
    });

    leaderContentHtml = `
      <div class="admin-content-area" style="padding:0;">
        <h3>${leader.group.toUpperCase()} Fellowship Money Info</h3>

        <div class="settings-card">
          <form onsubmit="saveHandoverMoney(event, '${leader.group}')">
            <label>Set / Update Group Handover Money (₦)</label>
            <input type="number" id="handover-input" value="${handoverMoney}" required />
            <button type="submit" class="btn-primary">Save Handover Money</button>
          </form>
        </div>

        <div class="two-col-grid">
          <div class="m-card">
            <h4>Handover Money</h4>
            <p>₦${handoverMoney.toLocaleString()}</p>
          </div>
          <div class="m-card">
            <h4>Total Dues</h4>
            <p>₦${totalDues.toLocaleString()}</p>
          </div>
          <div class="m-card">
            <h4>Total Arrears</h4>
            <p style="color:var(--danger)">₦${totalArrears.toLocaleString()}</p>
          </div>
          <div class="m-card">
            <h4>Paid Project Levy</h4>
            <p>₦${paidProjectLevy.toLocaleString()}</p>
          </div>
          <div class="m-card">
            <h4>Total Expenses</h4>
            <p style="color:var(--danger)">₦${totalExpenses.toLocaleString()}</p>
          </div>
          <div class="m-card" style="border: 1px solid var(--gold-primary);">
            <h4>Total Balance</h4>
            <p style="font-size:1.3rem;">₦${totalBalance.toLocaleString()}</p>
          </div>
        </div>
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
          <li><a onclick="renderGroupLeaderDashboard(getUsers().find(u=>u.phone==='${leader.phone}'), 'members'); toggleLeaderSidebar();" class="${view === 'members' ? 'active' : ''}"><i class="fa-solid fa-users"></i> View Members Details</a></li>
          <li><a onclick="renderGroupLeaderDashboard(getUsers().find(u=>u.phone==='${leader.phone}'), 'choose-excos'); toggleLeaderSidebar();" class="${view === 'choose-excos' ? 'active' : ''}"><i class="fa-solid fa-user-plus"></i> Choose Excos (Max 6)</a></li>
          <li><a onclick="renderGroupLeaderDashboard(getUsers().find(u=>u.phone==='${leader.phone}'), 'dues-records'); toggleLeaderSidebar();" class="${view === 'dues-records' ? 'active' : ''}"><i class="fa-solid fa-wallet"></i> View Members Dues Record</a></li>
          <li><a onclick="renderGroupLeaderDashboard(getUsers().find(u=>u.phone==='${leader.phone}'), 'projects'); toggleLeaderSidebar();" class="${view === 'projects' ? 'active' : ''}"><i class="fa-solid fa-diagram-project"></i> View Project Levy History</a></li>
          <li><a onclick="renderGroupLeaderDashboard(getUsers().find(u=>u.phone==='${leader.phone}'), 'notifications'); toggleLeaderSidebar();" class="${view === 'notifications' ? 'active' : ''}"><i class="fa-solid fa-bullhorn"></i> Group Notification Broadcast</a></li>
          <li><a onclick="renderGroupLeaderDashboard(getUsers().find(u=>u.phone==='${leader.phone}'), 'money-info'); toggleLeaderSidebar();" class="${view === 'money-info' ? 'active' : ''}"><i class="fa-solid fa-sack-dollar"></i> Money Info</a></li>
          <li><a onclick="routeUserDashboard(getUsers().find(u=>u.phone==='${leader.phone}'), 'home')"><i class="fa-solid fa-arrow-left"></i> Exit Leader Portal</a></li>
        </ul>
      </aside>
    </div>
  `;
}

function toggleLeaderSidebar() {
  const sidebar = document.getElementById("leader-sidebar");
  sidebar.classList.toggle("open");
}

function handleAssignExco(e, leaderPhone) {
  e.preventDefault();
  const targetPhone = document.getElementById("exco-member-phone").value;
  const roleName = document.getElementById("exco-role-name").value.trim();

  let users = getUsers();
  let member = users.find(u => u.phone === targetPhone);
  if (member) {
    member.excoRole = roleName;
    saveUsers(users);
    alert(`${member.fullName} assigned as ${roleName}!`);
    renderGroupLeaderDashboard(users.find(u => u.phone === leaderPhone), 'choose-excos');
  }
}

function removeExcoRole(phone, leaderPhone) {
  let users = getUsers();
  let member = users.find(u => u.phone === phone);
  if (member) {
    delete member.excoRole;
    saveUsers(users);
    alert("Exco role removed.");
    renderGroupLeaderDashboard(users.find(u => u.phone === leaderPhone), 'choose-excos');
  }
}

function generateLeaderDuesTable(usersList, groupKey) {
  return `
    <table class="members-table">
      <thead>
        <tr>
          <th>Member Name</th>
          <th>Phone</th>
          <th>Total Paid</th>
          <th>Arrears / Owing</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        ${usersList.map(u => {
          let dues = calculateMemberDues(u.phone);
          return `
            <tr>
              <td>${u.fullName}</td>
              <td>${u.phone}</td>
              <td>₦${dues.totalPaid.toLocaleString()}</td>
              <td style="color:${dues.amountOwing > 0 ? 'var(--danger)' : 'var(--gold-primary)'}">₦${dues.amountOwing.toLocaleString()}</td>
              <td><button class="btn-sm-edit" onclick="viewMemberLedgerModal('${u.phone}')">View Dues History</button></td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

function filterLeaderDuesSearch(groupKey) {
  const query = document.getElementById("leader-search-input").value.toLowerCase();
  const users = getUsers().filter(u => u.group === groupKey && u.fullName.toLowerCase().includes(query));
  document.getElementById("leader-dues-results").innerHTML = generateLeaderDuesTable(users, groupKey);
}

function viewMemberLedgerModal(phone) {
  const user = getUsers().find(u => u.phone === phone);
  const dues = calculateMemberDues(phone);

  let rows = dues.ledger.map(item => `
    <tr>
      <td>${item.label}</td>
      <td>₦${item.required.toLocaleString()}</td>
      <td>₦${item.paid.toLocaleString()}</td>
      <td><span class="badge ${item.status}">${item.status.toUpperCase()}</span></td>
    </tr>
  `).join('');

  const modalHtml = `
    <div class="modal-overlay" id="ledger-modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>${user.fullName} Dues Breakdown</h3>
          <button onclick="document.getElementById('ledger-modal').remove()" class="close-sidebar-btn"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div style="max-height:300px; overflow-y:auto;">
          <table class="members-table">
            <thead>
              <tr><th>Month</th><th>Req</th><th>Paid</th><th>Status</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function handleSendGroupBroadcast(e, groupKey) {
  e.preventDefault();
  const title = document.getElementById("notif-title").value.trim();
  const message = document.getElementById("notif-msg").value.trim();
  const fileInput = document.getElementById("notif-img");

  const records = getFinancialRecords(`omega_notifications_${groupKey}`);

  const saveBroadcast = (imgData = "") => {
    records.unshift({
      title,
      message,
      image: imgData,
      date: new Date().toLocaleString()
    });
    saveFinancialRecords(`omega_notifications_${groupKey}`, records);
    alert(`Broadcast notification sent to all ${groupKey.toUpperCase()} members!`);
    alert(`POPUP NOTIFICATION:\n\n[${title}]\n${message}`);
  };

  if (fileInput.files[0]) {
    const reader = new FileReader();
    reader.onload = function(evt) { saveBroadcast(evt.target.result); };
    reader.readAsDataURL(fileInput.files[0]);
  } else {
    saveBroadcast();
  }
}

function viewNotificationDetail(index, groupKey) {
  const records = getFinancialRecords(`omega_notifications_${groupKey}`);
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
        ${notif.image ? `<img src="${notif.image}" style="width:100%; border-radius:6px; margin-bottom:10px;" />` : ''}
        <p style="font-size:0.9rem; line-height:1.4;">${notif.message}</p>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function saveHandoverMoney(e, groupKey) {
  e.preventDefault();
  const val = document.getElementById("handover-input").value;
  localStorage.setItem(`omega_handover_${groupKey}`, val);
  alert("Handover money updated successfully!");
}

function toggleMemberSidebar() {
  const sidebar = document.getElementById("member-sidebar");
  sidebar.classList.toggle("open");
}

function logout() {
  localStorage.removeItem("omega_current_user");
  renderAuthSelection();
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
          <select id="reg-dept" onchange="handleDeptSelectPopup(this.value)">
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

function handleDeptSelectPopup(deptVal) {
  if (deptVal) {
    alert(`You have selected the "${deptVal}" Department!`);
  }
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

        <button type="submit" class="btn-primary">SAVE</button>
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
        
        <a href="data:text/html;charset=utf-8,${encodeURIComponent('<h1>OMEGA CITY OF MERCY - MAIN ADMIN PORTAL</h1><p>Separate Downloadable Login</p>')}" download="Main_Admin_Portal.html" class="download-link">
          <i class="fa-solid fa-download"></i> Download Separate Admin Login
        </a>

        <button type="button" onclick="renderAuthSelection()" class="btn-text">Back to Home</button>
      </form>
    </div>
  `;
}

function handleAdminLogin(e) {
  e.preventDefault();
  renderAdminDashboard();
}

// ADMIN DASHBOARD
function renderAdminDashboard(view = "home") {
  const container = document.getElementById("view-container");
  
  let mainContentHtml = "";

  const tithes = getFinancialRecords("omega_tithes");
  const offerings = getFinancialRecords("omega_offerings");
  const churchExpenses = getFinancialRecords("omega_expenses");
  const groupExpenses = getFinancialRecords("omega_group_expenses");
  const duesPayments = getFinancialRecords("omega_dues_payments");
  const projectContributions = getFinancialRecords("omega_projects");

  const totalTithes = tithes.reduce((sum, item) => sum + Number(item.amount), 0);
  const totalOfferings = offerings.reduce((sum, item) => sum + Number(item.amount), 0);
  const totalDues = duesPayments.reduce((sum, item) => sum + Number(item.amount), 0);
  const totalProjects = projectContributions.reduce((sum, item) => sum + Number(item.amount), 0);
  
  const totalChurchExpenses = churchExpenses.reduce((sum, item) => sum + Number(item.amount), 0);
  const totalGroupExpenses = groupExpenses.reduce((sum, item) => sum + Number(item.amount), 0);

  const totalInflow = totalTithes + totalOfferings + totalDues + totalProjects;
  const totalExpenses = totalChurchExpenses + totalGroupExpenses;
  const balance = totalInflow - totalExpenses;

  if (view === "home") {
    mainContentHtml = `
      <section class="cards-container">
        <div class="summary-card">
          <h4>Total Group Inflow</h4>
          <p>₦${totalInflow.toLocaleString()}</p>
        </div>
        <div class="summary-card">
          <h4>Total Group Expenses</h4>
          <p>₦${totalExpenses.toLocaleString()}</p>
        </div>
        <div class="summary-card">
          <h4>Total Dues Collected</h4>
          <p>₦${totalDues.toLocaleString()}</p>
        </div>
        <div class="summary-card">
          <h4>Total Group Balance</h4>
          <p>₦${balance.toLocaleString()}</p>
        </div>
      </section>
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
            <h4 style="font-size:0.75rem; color:var(--gold-primary);">Assigned Group Excos:</h4>
            ${excos.map(e => `
              <div class="exco-item">• <strong>${e.fullName}</strong> (${e.excoRole}) -${e.phone}</div>
            `).join('') || '<p style="font-size:0.7rem; color:var(--text-muted);">No excos assigned.</p>'}
          </div>
        </div>
      `;
    }).join('');

    mainContentHtml = `
      <div class="admin-content-area">
        <h3>Appoint / Assign Group Leaders</h3>
        <div class="settings-card">
          <form onsubmit="handleAppointGroupLeader(event)">
            <label>1. Select Fellowship Group</label>
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
  } else if (["all", "men", "women", "youth", "workforce", "dept-sanitation", "dept-technical", "dept-security", "dept-choir", "dept-usher", "dept-children"].includes(view)) {
    const users = getUsers();
    let filteredUsers = users;

    if (view === "men") filteredUsers = users.filter(u => u.group === "men");
    else if (view === "women") filteredUsers = users.filter(u => u.group === "women");
    else if (view === "youth") filteredUsers = users.filter(u => u.group === "youth");
    else if (view === "workforce") filteredUsers = users.filter(u => u.isWorker);
    else if (view === "dept-sanitation") filteredUsers = users.filter(u => u.department === "Sanitation");
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
          <li><a onclick="renderAdminDashboard('leaders'); toggleSidebar();" class="${view === 'leaders' ? 'active' : ''}"><i class="fa-solid fa-user-shield"></i> Group Leaders</a></li>
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
  const pin = document.getElementById("leader-7digit-pin").value.trim();

  if (pin.length !== 7 || isNaN(pin)) {
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
    leader.leaderPin = pin;
    saveUsers(users);
    alert(`${leader.fullName} appointed as ${groupKey.toUpperCase()} Group Leader with 7-Digit PIN set!`);
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

function previewAudioSound(id) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(440 + id * 50, ctx.currentTime);
  osc.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.3);
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
