// 1. SUPABASE CONFIGURATION (Corrected Project URL - removed extra 's')
const SUPABASE_URL = 'https://oakzredwhhnjyvlite.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Hr7ZGgf2UGl6Qkpa2XGgmQ_wVq390td';

if (window.supabase) {
  window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// Helper to compress uploaded images before sending to Supabase
function compressImage(file, callback) {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = (event) => {
    const img = new Image();
    img.src = event.target.result;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 200;
      const MAX_HEIGHT = 200;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      callback(canvas.toDataURL('image/jpeg', 0.7)); // Compressed Base64 string
    };
  };
}

// 2. Updated Registration Handler using compressed image
function handleFinalRegistration(e) {
  e.preventDefault();
  const pin = document.getElementById("reg-pin").value;
  if (pin !== document.getElementById("reg-pin-confirm").value) {
    alert("PINs do not match!");
    return;
  }

  const fileInput = document.getElementById("reg-pic");

  const saveProcess = async (base64Pic) => {
    tempRegData.profilePic = base64Pic;
    tempRegData.pin = pin;

    const saved = await saveUserToSupabase(tempRegData);
    if (saved) {
      alert("Registration saved successfully to Supabase! Please log in.");
      renderLogin();
    }
  };

  if (fileInput.files[0]) {
    compressImage(fileInput.files[0], (compressedBase64) => {
      saveProcess(compressedBase64);
    });
  } else {
    saveProcess("");
  }
}
