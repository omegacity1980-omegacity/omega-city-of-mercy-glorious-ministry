<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Omega City Of Mercy - Financial Record</title>
  <link rel="manifest" href="manifest.json" />
  <meta name="theme-color" content="#0d0d0d" />
  <!-- FontAwesome Icons -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
  <style>
    /* Dark Gold Theme */
    :root {
      --bg-color: #0d0d0d;
      --card-bg: #1a1a1a;
      --card-border: #2a2a2a;
      --text-color: #f1f1f1;
      --text-muted: #a0a0a0;
      --gold-primary: #d4af37;
      --gold-glow: rgba(212, 175, 55, 0.3);
      --danger: #e63946;
      --success: #38b000;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    body { background-color: var(--bg-color); color: var(--text-color); min-height: 100vh; overflow-x: hidden; }
    .hidden { display: none !important; }

    /* Splash Screen */
    .splash-screen {
      position: fixed; inset: 0; background-color: var(--bg-color);
      display: flex; justify-content: center; align-items: center;
      z-index: 9999; padding: 20px; text-align: center;
    }
    .splash-content { width: 100%; max-width: 360px; display: flex; flex-direction: column; align-items: center; }
    .church-title { font-size: 1.05rem; font-weight: 700; color: var(--gold-primary); letter-spacing: 1px; margin-bottom: 30px; text-transform: uppercase; }
    .animation-container { position: relative; width: 110px; height: 110px; display: flex; justify-content: center; align-items: center; margin-bottom: 25px; }
    .rolling-arrows {
      position: absolute; width: 100%; height: 100%; border: 3px solid transparent;
      border-top-color: var(--gold-primary); border-right-color: var(--gold-primary);
      border-radius: 50%; animation: spin 1.5s linear infinite;
    }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    .logo-box {
      position: relative; width: 65px; height: 65px; background: var(--card-bg);
      border-radius: 50%; display: flex; justify-content: center; align-items: center;
      border: 1px solid var(--gold-primary); box-shadow: 0 0 15px var(--gold-glow);
    }
    .book-icon { font-size: 1.6rem; color: var(--gold-primary); }
    .pen-icon { position: absolute; top: 16px; right: 16px; font-size: 1rem; color: #ffffff; animation: write 1.2s ease-in-out infinite alternate; }
    @keyframes write { 0% { transform: translate(0, 0) rotate(0deg); } 100% { transform: translate(-4px, 4px) rotate(-10deg); } }
    .slogan { font-size: 0.85rem; font-style: italic; color: var(--text-muted); margin-bottom: 35px; }
    .progress-bar-container { width: 100%; height: 4px; background: var(--card-border); border-radius: 2px; overflow: hidden; }
    .progress-bar { width: 0%; height: 100%; background: var(--gold-primary); box-shadow: 0 0 8px var(--gold-primary); animation: fillProgress 6s linear forwards; }
    @keyframes fillProgress { 0% { width: 0%; } 100% { width: 100%; } }

    /* Forms & Auth */
    #app { display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 15px; }
    .auth-box { width: 100%; max-width: 400px; background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 12px; padding: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); }
    .brand-header h2 { color: var(--gold-primary); font-size: 1.2rem; margin-bottom: 6px; text-align: center; }
    .brand-header p { color: var(--text-muted); font-size: 0.8rem; text-align: center; margin-bottom: 24px; }
    .auth-box h2 { font-size: 1.2rem; color: var(--gold-primary); margin-bottom: 16px; text-align: center; }
    .input-group, form { display: flex; flex-direction: column; gap: 12px; }
    label { font-size: 0.8rem; color: var(--text-muted); }
    input, select { width: 100%; padding: 12px; background: #121212; border: 1px solid var(--card-border); border-radius: 6px; color: #fff; font-size: 0.9rem; }
    input:focus, select:focus { outline: none; border-color: var(--gold-primary); }
    
    /* Buttons */
    .btn-primary { width: 100%; padding: 12px; background: var(--gold-primary); color: #000; font-weight: 600; border: none; border-radius: 6px; cursor: pointer; margin-top: 10px; }
    .btn-secondary { width: 100%; padding: 12px; background: transparent; color: var(--gold-primary); border: 1px solid var(--gold-primary); font-weight: 600; border-radius: 6px; cursor: pointer; margin-top: 8px; }
    .btn-admin-link { width: 100%; padding: 10px; background: transparent; color: var(--text-muted); border: none; font-size: 0.8rem; cursor: pointer; margin-top: 10px; text-decoration: underline; }
    .btn-text { background: none; border: none; color: var(--text-muted); font-size: 0.85rem; cursor: pointer; margin-top: 8px; text-align: center; }

    /* Admin Dashboard */
    .admin-wrapper { display: flex; width: 100vw; min-height: 100vh; position: relative; }
    .admin-sidebar { width: 220px; background: #141414; border-right: 1px solid var(--card-border); display: flex; flex-direction: column; transition: transform 0.3s ease; z-index: 100; }
    .sidebar-header { padding: 16px; border-bottom: 1px solid var(--card-border); font-size: 0.9rem; font-weight: bold; color: var(--gold-primary); }
    .sidebar-menu { list-style: none; padding: 10px 0; flex: 1; overflow-y: auto; }
    .sidebar-menu li a { display: flex; align-items: center; gap: 10px; padding: 12px 16px; color: var(--text-muted); text-decoration: none; font-size: 0.85rem; cursor: pointer; }
    .sidebar-menu li a:hover, .sidebar-menu li a.active { background: var(--card-bg); color: var(--gold-primary); border-left: 3px solid var(--gold-primary); }
    .admin-main { flex: 1; display: flex; flex-direction: column; background: var(--bg-color); overflow-y: auto; }
    .admin-topbar { display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; background: var(--card-bg); border-bottom: 1px solid var(--card-border); }
    .topbar-left { display: flex; align-items: center; gap: 15px; }
    .toggle-btn { background: none; border: none; color: var(--gold-primary); font-size: 1.2rem; cursor: pointer; }
    .topbar-right { display: flex; align-items: center; gap: 15px; }
    .notification-bell { position: relative; font-size: 1.1rem; color: var(--text-color); cursor: pointer; }
    .bell-badge { position: absolute; top: -5px; right: -8px; background: var(--danger); color: #fff; font-size: 0.65rem; border-radius: 50%; padding: 2px 5px; }
    .admin-profile { display: flex; align-items: center; gap: 10px; }
    .admin-avatar { width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--gold-primary); }
    .admin-info span { display: block; font-size: 0.8rem; }
    .admin-info .admin-phone { font-size: 0.7rem; color: var(--text-muted); }
    .cards-container { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; padding: 20px; }
    .summary-card { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 8px; padding: 16px; pointer-events: none; }
    .summary-card h4 { font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 8px; }
    .summary-card p { font-size: 1.3rem; font-weight: 700; color: var(--gold-primary); }

    /* Member Dashboard */
    .member-dashboard-wrapper { width: 100vw; min-height: 100vh; background: var(--bg-color); display: flex; flex-direction: column; }
    .member-topbar { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: var(--card-bg); border-bottom: 1px solid var(--card-border); }
    .member-profile-section { display: flex; align-items: center; gap: 12px; }
    .member-avatar-img { width: 45px; height: 45px; border-radius: 50%; border: 2px solid var(--gold-primary); object-fit: cover; }
    .member-profile-section h4 { font-size: 0.95rem; color: #fff; }
    .member-id-tag, .member-phone-tag { font-size: 0.75rem; color: var(--text-muted); }
    .member-topbar-right { display: flex; align-items: center; gap: 15px; }
    .btn-logout { background: none; border: none; color: var(--danger); font-size: 1.1rem; cursor: pointer; }
    .member-content { padding: 20px; max-width: 800px; margin: 0 auto; width: 100%; }
    .welcome-banner { margin-bottom: 20px; text-align: center; }
    .welcome-banner h2 { font-size: 1.2rem; color: var(--gold-primary); margin-bottom: 6px; }
    .slogan-text { font-size: 0.8rem; color: var(--text-muted); font-style: italic; }
    .workforce-badge { color: var(--success); font-size: 0.85rem; }
    .member-card-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 20px; }
    .m-card { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 8px; padding: 14px; text-align: center; }
    .m-card h4 { font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px; }
    .m-card p { font-size: 1.15rem; font-weight: 700; color: var(--gold-primary); }
    .read-only-notice { background: rgba(212, 175, 55, 0.05); border: 1px dashed var(--gold-primary); padding: 10px; border-radius: 6px; font-size: 0.75rem; color: var(--gold-primary); text-align: center; display: flex; justify-content: center; align-items: center; gap: 8px; }

    @media (max-width: 768px) {
      .admin-sidebar { position: absolute; height: 100%; transform: translateX(-100%); }
      .admin-sidebar.open { transform: translateX(0); }
    }
  </style>
</head>
<body>

  <!-- LOADING SCREEN -->
  <div id="loading-screen" class="splash-screen">
    <div class="splash-content">
      <h1 class="church-title">OMEGA CITY OF MERCY FINANCIAL RECORD</h1>
      <div class="animation-container">
        <div class="rolling-arrows"></div>
        <div class="logo-box">
          <i class="fa-solid fa-book-open book-icon"></i>
          <i class="fa-solid fa-pen-nib pen-icon"></i>
        </div>
      </div>
      <p class="slogan">Keeping financial records transparent.</p>
      <div class="progress-bar-container">
        <div class="progress-bar"></div>
      </div>
    </div>
  </div>

  <div id="app" class="hidden">
    <div id="view-container"></div>
  </div>

  <script>
    document.addEventListener("DOMContentLoaded", () => {
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

    function getUsers() { return JSON.parse(localStorage.getItem("omega_users")) || []; }
    function saveUsers(users) { localStorage.setItem("omega_users", JSON.stringify(users)); }

    function renderAuthSelection() {
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

    function handleLogin(e) {
      e.preventDefault();
      const phone = document.getElementById("login-phone").value.trim();
      const pin = document.getElementById("login-pin").value.trim();
      const user = getUsers().find(u => u.phone === phone && u.pin === pin);

      if (!user) { alert("Invalid credentials!"); return; }
      routeUserDashboard(user);
    }

    function routeUserDashboard(user) {
      document.getElementById("view-container").innerHTML = `
        <div class="member-dashboard-wrapper">
          <header class="member-topbar">
            <div class="member-profile-section">
              <img src="${user.profilePic || 'https://via.placeholder.com/45'}" class="member-avatar-img" />
              <div>
                <h4>${user.fullName}</h4>
                <span class="member-id-tag">ID: OCM-${user.phone.slice(-4)}</span>
              </div>
            </div>
            <button onclick="renderAuthSelection()" class="btn-logout"><i class="fa-solid fa-right-from-bracket"></i></button>
          </header>
          <div class="member-content">
            <div class="welcome-banner">
              <h2>${user.group.toUpperCase()} Fellowship Dashboard ${user.isWorker ? '<span class="workforce-badge">| Workforce</span>' : ''}</h2>
              <p class="slogan-text">Omega City Of Mercy - Keeping financial records transparent.</p>
            </div>
            <div class="member-card-grid">
              <div class="m-card"><h4>Total Dues Paid</h4><p>₦0.00</p></div>
              <div class="m-card"><h4>Amount Owing</h4><p>₦0.00</p></div>
              <div class="m-card"><h4>Dues Rating</h4><p>0%</p></div>
            </div>
            <div class="read-only-notice"><i class="fa-solid fa-lock"></i> Financial records are read-only for members.</div>
          </div>
        </div>
      `;
    }

    let tempRegData = {};
    function renderRegistrationStep1() {
      document.getElementById("view-container").innerHTML = `
        <div class="auth-box">
          <h2>Registration (1/3)</h2>
          <form onsubmit="handleRegStep1(event)">
            <input type="text" id="reg-name" placeholder="Full Name" required />
            <input type="tel" id="reg-phone" placeholder="Phone Number" required />
            <button type="submit" class="btn-primary">Proceed</button>
            <button type="button" onclick="renderAuthSelection()" class="btn-text">Cancel</button>
          </form>
        </div>
      `;
    }

    function handleRegStep1(e) {
      e.preventDefault();
      tempRegData = { fullName: document.getElementById("reg-name").value, phone: document.getElementById("reg-phone").value };
      renderRegistrationStep2();
    }

    function renderRegistrationStep2() {
      document.getElementById("view-container").innerHTML = `
        <div class="auth-box">
          <h2>Group Assignment (2/3)</h2>
          <form onsubmit="handleRegStep2(event)">
            <label>Marital Status</label>
            <select id="reg-marital" required>
              <option value="single">Single</option>
              <option value="married">Married</option>
            </select>
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

    function handleRegStep2(e) {
      e.preventDefault();
      const marital = document.getElementById("reg-marital").value;
      tempRegData.group = marital === "single" ? "youth" : "men";
      tempRegData.isWorker = document.getElementById("reg-worker").value === "yes";
      renderRegistrationStep3();
    }

    function renderRegistrationStep3() {
      document.getElementById("view-container").innerHTML = `
        <div class="auth-box">
          <h2>Security Setup (3/3)</h2>
          <form onsubmit="handleFinalRegistration(event)">
            <label>Choose 4-Digit PIN</label>
            <input type="password" id="reg-pin" maxlength="4" required />
            <button type="submit" class="btn-primary">Register</button>
          </form>
        </div>
      `;
    }

    function handleFinalRegistration(e) {
      e.preventDefault();
      tempRegData.pin = document.getElementById("reg-pin").value;
      const users = getUsers();
      users.push(tempRegData);
      saveUsers(users);
      alert("Registration successful!");
      renderLogin();
    }

    function renderAdminLogin() {
      document.getElementById("view-container").innerHTML = `
        <div class="auth-box">
          <h2>Main Admin Login</h2>
          <button onclick="renderAdminDashboard()" class="btn-primary">Access Admin Portal</button>
          <button onclick="renderAuthSelection()" class="btn-text">Back</button>
        </div>
      `;
    }

    function renderAdminDashboard() {
      document.getElementById("view-container").innerHTML = `
        <div class="admin-wrapper">
          <main class="admin-main">
            <header class="admin-topbar">
              <h3>Admin Portal</h3>
              <button onclick="renderAuthSelection()" class="btn-text">Logout</button>
            </header>
            <section class="cards-container">
              <div class="summary-card"><h4>Total Inflow</h4><p>₦0.00</p></div>
              <div class="summary-card"><h4>Total Expenses</h4><p>₦0.00</p></div>
            </section>
          </main>
        </div>
      `;
    }
  </script>
</body>
</html>
