// Initialize Supabase Client (Replace with your actual Supabase URL and Anon Key if not already set globally)
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Function to load Admin Dashboard Summary from Supabase View
async function loadAdminDashboard() {
  const { data, error } = await supabase
    .from('admin_dashboard_summary')
    .select('*')
    .single();

  if (error) {
    console.error('Error fetching summary:', error);
    return;
  }

  if (data) {
    document.getElementById('total-balance').textContent = '₦' + Number(data.total_group_balance).toLocaleString();
    document.getElementById('total-dues').textContent = '₦' + Number(data.total_group_dues).toLocaleString();
    document.getElementById('total-inflow').textContent = '₦' + Number(data.total_group_inflow).toLocaleString();
    document.getElementById('total-handover').textContent = '₦' + Number(data.total_group_handover).toLocaleString();
    document.getElementById('total-expenses').textContent = '₦' + Number(data.total_group_expenses).toLocaleString();
  }
}

// Run on page load
loadAdminDashboard();
