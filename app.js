document.addEventListener("DOMContentLoaded", () => {
  // 1. 6-Second Loading Screen Timer
  setTimeout(() => {
    const loadingScreen = document.getElementById("loading-screen");
    const appContainer = document.getElementById("app");
    
    loadingScreen.style.opacity = "0";
    loadingScreen.style.transition = "opacity 0.5s ease";
    
    setTimeout(() => {
      loadingScreen.classList.add("hidden");
      appContainer.classList.remove("hidden");
      renderAuthSelection(); // Show Login/Register choice after loading
    }, 500);
  }, 6000);
});

// Helper: Get users from localStorage database simulation
function getUsers() {
  return JSON.parse(localStorage.getItem("omega_users")) || [];
}

function saveUsers(users) {
  localStorage.setItem("omega_users", JSON.stringify(users));
}

// Render Login / Register Selection Choice
function renderAuthSelection() {
  const container = document.getElementById("view-container");
  container.innerHTML = `
    <div class="auth-box">
      <div class="brand-header">
        <h2>OMEGA CITY OF MERCY</h2>
        <p>Keeping financial records transparent.</p>
      </div>
      <div class="auth-buttons">
        <button onclick="renderLogin()" class="btn-primary">Login</button>
        <button onclick="renderRegistrationStep1()" class="btn-secondary">Register New Account</button>
        <button onclick="renderAdminLogin()" class="btn-admin-link">Main Admin Login</button>
      </div>
    </div>
  `;
}

// 2. LOGIN VIEW (Phone Number & 4-Digit PIN)
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

  // Save current session
  localStorage.setItem("omega_current_user", JSON.stringify(user));
  routeUserDashboard(user);
}

// Route user to respective dashboard based on group sorting
function routeUserDashboard(user) {
  const container = document.getElementById("view-container");
  container.innerHTML = `
    <div class="dashboard-container">
      <header class="dash-header">
        <div class="user-info">
          <img src="${user.profilePic || 'https://via.placeholder.com/50'}" class="profile-pic" />
          <div>
            <h3>${user.fullName}</h3>
            <span class="badge">${user.group.toUpperCase()} ${user.isWorker ? '| WORKFORCE' : ''}</span>
          </div>
        </div>
        <button onclick="logout()" class="btn-logout"><i class="fa-solid fa-right-from-bracket"></i></button>
      </header>

      <div class="dash-content">
        <h2>Welcome to your ${user.group.toUpperCase()} Dashboard</h2>
        <p>Your financial records and transparency ledger are up to date.</p>
        <div class="card-grid">
          <div class="card">
            <h3>Total Dues Paid</h3>
            <p>₦0.00</p>
          </div>
          <div class="card">
            <h3>Amount Owing</h3>
            <p>₦0.00</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

function logout() {
  localStorage.removeItem("omega_current_user");
  renderAuthSelection();
}

// 3. REGISTRATION FUNNEL - STEP 1
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

  // Check duplicate phone number
  const users = getUsers();
  if (users.some(u => u.phone === tempRegData.phone)) {
    alert("This phone number is already registered!");
    return;
  }

  renderRegistrationStep2();
}

// REGISTRATION FUNNEL - STEP 2 (Marital Status & Group Filtering)
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

  let assignedGroup = "youth"; // Default for single
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

// REGISTRATION FUNNEL - STEP 3 (Profile Picture & PIN)
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

// Admin Login Placeholder
function renderAdminLogin() {
  const container = document.getElementById("view-container");
  container.innerHTML = `
    <div class="auth-box">
      <h2>Main Admin Login</h2>
      <p>Admin features coming up next.</p>
      <button onclick="renderAuthSelection()" class="btn-secondary">Back</button>
    </div>
  `;
}
