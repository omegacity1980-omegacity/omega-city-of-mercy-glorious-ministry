// Replace renderAdminLogin & add Admin functions

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
  // Default login check for main admin
  renderAdminDashboard();
}

function renderAdminDashboard() {
  const container = document.getElementById("view-container");
  container.innerHTML = `
    <div class="admin-wrapper">
      <!-- Compact Sidebar -->
      <aside class="admin-sidebar" id="admin-sidebar">
        <div class="sidebar-header">OMEGA ADMIN</div>
        <ul class="sidebar-menu">
          <li><a href="#" class="active"><i class="fa-solid fa-chart-line"></i> Dashboard</a></li>
          <li><a href="#" onclick="alert('Viewing All Members')"><i class="fa-solid fa-users"></i> All Members</a></li>
          <li><a href="#" onclick="alert('Viewing Men Group')"><i class="fa-solid fa-user-tie"></i> Men</a></li>
          <li><a href="#" onclick="alert('Viewing Women Group')"><i class="fa-solid fa-user-dress"></i> Women</a></li>
          <li><a href="#" onclick="alert('Viewing Youth Group')"><i class="fa-solid fa-child"></i> Youth</a></li>
          <li><a href="#" onclick="alert('Viewing Workforce')"><i class="fa-solid fa-briefcase"></i> Workforce</a></li>
          <li><a href="#" onclick="alert('Offerings')"><i class="fa-solid fa-hand-holding-dollar"></i> Offering</a></li>
          <li><a href="#" onclick="alert('Tithes')"><i class="fa-solid fa-coins"></i> Tithe</a></li>
          <li><a href="#" onclick="alert('Group Projects')"><i class="fa-solid fa-diagram-project"></i> Group Projects</a></li>
          <li><a href="#" onclick="alert('Church Expenses')"><i class="fa-solid fa-file-invoice-dollar"></i> Church Expenses</a></li>
          <li><a href="#" onclick="alert('Group Expenses')"><i class="fa-solid fa-receipt"></i> Group Expenses</a></li>
          <li><a href="#" onclick="alert('Settings')"><i class="fa-solid fa-gear"></i> Settings</a></li>
        </ul>
      </aside>

      <!-- Main Section -->
      <main class="admin-main">
        <!-- Topbar -->
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

        <!-- Non-Clickable Financial Cards -->
        <section class="cards-container">
          <div class="summary-card">
            <h4>Total Group Inflow</h4>
            <p>₦0.00</p>
          </div>
          <div class="summary-card">
            <h4>Total Group Expenses</h4>
            <p>₦0.00</p>
          </div>
          <div class="summary-card">
            <h4>Total Group Dues</h4>
            <p>₦0.00</p>
          </div>
          <div class="summary-card">
            <h4>Total Group Balance</h4>
            <p>₦0.00</p>
          </div>
        </section>
      </main>
    </div>
  `;
}

function toggleSidebar() {
  const sidebar = document.getElementById("admin-sidebar");
  sidebar.classList.toggle("open");
}
// Dynamic Member Dashboard based on Group
function routeUserDashboard(user) {
  const container = document.getElementById("view-container");
  
  // Choose header color or badge title based on group
  let groupTitle = "Member Dashboard";
  if (user.group === "men") groupTitle = "Men Fellowship Dashboard";
  else if (user.group === "women") groupTitle = "Women Fellowship Dashboard";
  else if (user.group === "youth") groupTitle = "Youth Fellowship Dashboard";

  container.innerHTML = `
    <div class="member-dashboard-wrapper">
      <!-- Top Member Header -->
      <header class="member-topbar">
        <div class="member-profile-section">
          <img src="${user.profilePic || 'https://via.placeholder.com/45'}" class="member-avatar-img" />
          <div>
            <h4>${user.fullName}</h4>
            <span class="member-id-tag">ID: OCM-${user.phone.slice(-4)}</span> | <span class="member-phone-tag">${user.phone}</span>
          </div>
        </div>
        <div class="member-topbar-right">
          <div class="notification-bell" onclick="alert('No new notifications')">
            <i class="fa-solid fa-bell"></i>
            <span class="bell-badge">1</span>
          </div>
          <button onclick="logout()" class="btn-logout" title="Logout"><i class="fa-solid fa-right-from-bracket"></i></button>
        </div>
      </header>

      <!-- Main Member Content Area -->
      <div class="member-content">
        <div class="welcome-banner">
          <h2>${groupTitle} ${user.isWorker ? '<span class="workforce-badge">| Workforce</span>' : ''}</h2>
          <p class="slogan-text">Omega City Of Mercy - Keeping financial records transparent.</p>
        </div>

        <!-- Dashboard Cards (Read-Only) -->
        <div class="member-card-grid">
          <div class="m-card">
            <h4>Total Dues Paid</h4>
            <p>₦0.00</p>
          </div>
          <div class="m-card">
            <h4>Amount Owing</h4>
            <p>₦0.00</p>
          </div>
          <div class="m-card">
            <h4>Current Dues</h4>
            <p>₦1,000</p>
          </div>
          <div class="m-card">
            <h4>Advance Dues</h4>
            <p>₦0.00</p>
          </div>
          <div class="m-card">
            <h4>Dues Rating</h4>
            <p>0%</p>
          </div>
          <div class="m-card">
            <h4>Project Contributions</h4>
            <p>₦0.00</p>
          </div>
        </div>

        <div class="read-only-notice">
          <i class="fa-solid fa-lock"></i> Financial records are read-only for members. Transparency is maintained.
        </div>
      </div>
    </div>
  `;
}
