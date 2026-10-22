// SUPABASE INITIALIZATION
const SUPABASE_URL = 'https://oakzredwhhnjyvlite.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Hr7ZGgf2UGl6Qkpa2XGgmQ_wVq390td';

if (window.supabase) {
  window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

let currentActiveState = { type: 'guest', view: 'home', user: null };

document.addEventListener("DOMContentLoaded", () => {
  initDuesConfig();

  // Fast splash screen load
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
  }, 1000);

  // Global Sidebar Close Handler
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

// DIRECT SUPABASE FETCHING & SAVING
async function getUsersFromSupabase() {
  if (window.supabaseClient) {
    const { data, error } = await window.supabaseClient.from('users').select('*').order('id', { ascending: true });
    if (!error && data) {
      return data.map(u => ({
        id: u.id,
        fullName: u.full_name || '',
        phone: u.phone || '',
        whatsapp: u.whatsapp || u.phone || '',
        email: u.email || '',
        dob: u.dob || '',
        origin: u.origin || '',
        residence: u.residence || '',
        address: u.address || '',
        isMarried: u.is_married || false,
        gender: u.gender || '',
        group: u.group || 'youth',
        isWorker: u.is_worker || false,
        department: u.department || '',
        pin: u.pin || '',
        profilePic: u.profile_pic || '',
        isGroupLeader: u.is_group_leader || false,
        excoRole: u.exco_role || null
      }));
    } else {
      console.error("Supabase fetch users error:", error);
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
      console.error("Supabase insert error:", error);
      alert("Error saving account to database: " + error.message);
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

// FINANCIAL CALCULATIONS
function getRateForMonth(year, monthIndex) {
  const monthStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
  const rates = getDuesRates().sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
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
      let paid = 0;
      let status = 'unpaid';

      if (remainingPool >= required) {
        paid = required;
        status = 'paid';
        remainingPool -= required;
      } else if (remainingPool > 0) {
        paid = remainingPool;
        status = 'partial';
        remainingPool = 0;
      }
      monthLedger.push({ label: `${monthName} ${y}`, required, paid, status });
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
  const projects = getFinancialRecords("omega_projects").filter(p => p.memberPhone === phone);
  return {
    total: projects.reduce((sum, p) => sum + Number(p.amount), 0),
    list: projects
  };
}

async function calculateGroupFinancials(groupKey) {
  const users = await getUsersFromSupabase();
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

// UI VIEW ROUTING
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

  localStorage.setItem("omega_current_user", JSON.stringify(user));
  routeUserDashboard(user, 'home');
}

// REGISTRATION FUNNEL
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
    fullName: document.getElementById("reg-name").value.trim(),
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
  tempRegData.isMarried = isMarried === "yes";
  tempRegData.gender = gender;
  tempRegData.group = assignedGroup;
  tempRegData.isWorker = isWorker === "yes";
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

function handleFinalRegistration(e) {
  e.preventDefault();
  const pin = document.getElementById("reg-pin").value;
  if (pin !== document.getElementById("reg-pin-confirm").value) {
    alert("PINs do not match!");
    return;
  }

  const fileInput = document.getElementById("reg-pic");
  const reader = new FileReader();

  reader.onload = async function(ev) {
    tempRegData.profilePic = ev.target.result;
    tempRegData.pin = pin;

    const saved = await saveUserToSupabase(tempRegData);
    if (saved) {
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
      const saved = await saveUserToSupabase(tempRegData);
      if (saved) {
        alert("Registration saved successfully to Supabase! Please log in.");
        renderLogin();
      }
    })();
  }
}

// MEMBER DASHBOARD
async function routeUserDashboard(user, view = 'home') {
  const users = await getUsersFromSupabase();
  const latestUser = users.find(u => u.phone === user.phone) || user;
  currentActiveState = { type: 'member', view, user: latestUser };

  const financials = calculateMemberDues(latestUser.phone);
  const projectsData = calculateMemberProjects(latestUser.phone);

  document.getElementById("view-container").innerHTML = `
    <div class="member-dashboard-wrapper">
      <header class="member-topbar">
        <h3>${latestUser.fullName} (${(latestUser.group || 'MEMBER').toUpperCase()})</h3>
        <button onclick="renderAuthSelection()" class="btn-logout">Logout</button>
      </header>
      <div class="member-content">
        <div class="welcome-banner">
          <h2>${(latestUser.group || 'MEMBER').toUpperCase()} DASHBOARD</h2>
        </div>
        <div class="member-card-grid">
          <div class="m-card"><h4>Dues Paid</h4><p>₦${financials.totalPaid.toLocaleString()}</p></div>
          <div class="m-card"><h4>Amount Owing</h4><p>₦${financials.amountOwing.toLocaleString()}</p></div>
          <div class="m-card"><h4>Projects</h4><p>₦${projectsData.total.toLocaleString()}</p></div>
        </div>
      </div>
    </div>
  `;
}

// ADMIN PORTAL
function renderAdminLogin() {
  document.getElementById("view-container").innerHTML = `
    <div class="auth-box">
      <h2>Main Admin Login</h2>
      <form onsubmit="renderAdminDashboard('home'); return false;">
        <input type="tel" required placeholder="Admin Phone" />
        <input type="password" maxlength="8" required placeholder="PIN" />
        <button type="submit" class="btn-primary">Access Admin Portal</button>
        <button type="button" onclick="renderAuthSelection()" class="btn-text">Back</button>
      </form>
    </div>
  `;
}

function toggleSidebar() {
  document.getElementById("admin-sidebar")?.classList.toggle("open");
}

async function renderAdminDashboard(view = "home") {
  currentActiveState = { type: 'admin', view, user: null };
  const users = await getUsersFromSupabase(); // Always query Supabase directly
  
  let mainContentHtml = "";

  if (view === "home") {
    mainContentHtml = `
      <section class="cards-container">
        <div class="balance-card-full">
          <h4>TOTAL REGISTERED MEMBERS (SUPABASE)</h4>
          <p>${users.length}</p>
        </div>
      </section>
    `;
  } else if (["all", "dept-sanitation", "dept-security", "dept-usher", "dept-technical", "dept-children", "dept-minister", "dept-choir"].includes(view)) {
    let filteredUsers = users;
    if (view.startsWith("dept-")) {
      const dept = view.replace("dept-", "").toLowerCase();
      filteredUsers = users.filter(u => u.department && u.department.toLowerCase() === dept);
    }

    let rows = filteredUsers.map((u, i) => `
      <tr>
        <td>${i + 1}</td>
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
        <div class="balance-card-full" style="margin-bottom:20px;">
          <h4>TOTAL REGISTERED MEMBERS (LIVE DATABASE)</h4>
          <p>${users.length}</p>
        </div>
        <h3>View Directory (${filteredUsers.length} records)</h3>
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
  } else if (["men", "women", "youth", "workforce"].includes(view)) {
    const fin = await calculateGroupFinancials(view);
    let rows = fin.members.map((u, i) => `
      <tr>
        <td>${i + 1}</td>
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
        <h3>${view.toUpperCase()} FELLOWSHIP</h3>
        <table class="members-table">
          <thead><tr><th>S/N</th><th>Name</th><th>Phone</th><th>Department</th><th>Action</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="5" style="text-align:center;">No members found.</td></tr>'}</tbody>
        </table>
      </div>
    `;
  }

  const isSidebarOpen = document.getElementById("admin-sidebar")?.classList.contains("open");

  document.getElementById("view-container").innerHTML = `
    <div class="admin-wrapper">
      <main class="admin-main">
        <header class="admin-topbar">
          <button class="toggle-btn-topleft" onclick="toggleSidebar()"><i class="fa-solid fa-bars"></i> Menu</button>
          <h3>Admin Portal</h3>
        </header>
        ${mainContentHtml}
      </main>

      <aside class="admin-sidebar ${isSidebarOpen ? 'open' : ''}" id="admin-sidebar">
        <div class="sidebar-header"><span>NAVIGATION</span><button onclick="toggleSidebar()"><i class="fa-solid fa-xmark"></i></button></div>
        <ul class="sidebar-menu">
          <li><a onclick="renderAdminDashboard('home'); toggleSidebar();" class="${view === 'home' ? 'active' : ''}">Dashboard</a></li>
          <li><a onclick="renderAdminDashboard('all'); toggleSidebar();" class="${view === 'all' ? 'active' : ''}">View All Members</a></li>
          <li><a onclick="renderAdminDashboard('men'); toggleSidebar();" class="${view === 'men' ? 'active' : ''}">Men Fellowship</a></li>
          <li><a onclick="renderAdminDashboard('women'); toggleSidebar();" class="${view === 'women' ? 'active' : ''}">Women Fellowship</a></li>
          <li><a onclick="renderAdminDashboard('youth'); toggleSidebar();" class="${view === 'youth' ? 'active' : ''}">Youth Fellowship</a></li>
          <li><a onclick="renderAdminDashboard('workforce'); toggleSidebar();" class="${view === 'workforce' ? 'active' : ''}">Workforce</a></li>
          <li><a onclick="renderAuthSelection()">Logout</a></li>
        </ul>
      </aside>
    </div>
  `;
}

// ADMIN MEMBER EDIT & DELETE (UPDATES SUPABASE LIVE)
async function editMember(phone) {
  const users = await getUsersFromSupabase();
  const user = users.find(u => u.phone === phone);
  if (!user) return;

  const newName = prompt("Edit Full Name:", user.fullName);
  if (newName === null || !newName.trim()) return;

  if (window.supabaseClient) {
    const { error } = await window.supabaseClient.from('users').update({ full_name: newName.trim() }).eq('phone', phone);
    if (error) {
      alert("Error updating database: " + error.message);
      return;
    }
  }

  alert("Member updated successfully in live database!");
  renderAdminDashboard('all');
}

async function deleteMember(phone) {
  if (confirm("Are you sure you want to delete this member from the live database?")) {
    if (window.supabaseClient) {
      const { error } = await window.supabaseClient.from('users').delete().eq('phone', phone);
      if (error) {
        alert("Error deleting from database: " + error.message);
        return;
      }
    }
    alert("Member deleted successfully from live database.");
    renderAdminDashboard('all');
  }
}

async function openMemberDetailsModal(phone) {
  const users = await getUsersFromSupabase();
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
        <div><strong>WhatsApp:</strong> ${u.whatsapp || u.phone}</div>
        <div><strong>Email:</strong> ${u.email || 'N/A'}</div>
        <div><strong>Group:</strong> ${u.group ? u.group.toUpperCase() : 'N/A'}</div>
        <div><strong>Department:</strong> ${u.isWorker ? (u.department || 'Yes') : 'No'}</div>
        
        <div style="display: flex; gap: 10px; margin-top: 15px;">
          <button onclick="document.getElementById('member-detail-modal').remove(); editMember('${u.phone}')" class="btn-primary" style="flex:1;">Edit Member</button>
          <button onclick="document.getElementById('member-detail-modal').remove(); deleteMember('${u.phone}')" class="btn-secondary" style="flex:1; border-color:var(--danger); color:var(--danger);">Delete Member</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modalOverlay);
}
