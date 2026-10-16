import React, { useState, useEffect } from 'react';
import Dashboard from './Dashboard';
import TransactionForm from './TransactionForm';
import TransactionList from './TransactionList';
import { supabase } from './supabaseClient';

function App() {
  const [transactions, setTransactions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch transactions from Supabase database when app loads
  useEffect(() => {
    fetchTransactions();
  }, []);

  async function fetchTransactions() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching transactions:', error);
      } else {
        setTransactions(data || []);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  }

  // Save a new transaction to Supabase database
  async function handleAddTransaction(newTx) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert([newTx])
        .select();

      if (error) {
        console.error('Error adding transaction:', error);
        alert('Failed to save transaction to database.');
      } else if (data) {
        setTransactions((prev) => [data[0], ...prev]);
        setShowForm(false);
      }
    } catch (err) {
      console.error('Unexpected error adding transaction:', err);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans p-4 max-w-md mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between py-4 border-b border-amber-500/20 mb-6">
        <div>
          <h1 className="text-xl font-bold text-amber-500 tracking-wide">
            OMEGA CITY OF MERCY
          </h1>
          <p className="text-xs text-neutral-400">Financial Management Dashboard</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold px-3 py-1.5 rounded-lg text-sm transition-colors"
        >
          {showForm ? 'Close' : '+ Add'}
        </button>
      </header>

      {/* Main Content */}
      <main className="space-y-6">
        {/* Dashboard Component */}
        <Dashboard transactions={transactions} />

        {/* Transaction Form Modal / Dropdown */}
        {showForm && (
          <div className="pt-2">
            <TransactionForm
              onAddTransaction={handleAddTransaction}
              onClose={() => setShowForm(false)}
            />
          </div>
        )}

        {/* Transaction List Component */}
        <div className="pt-2">
          {loading ? (
            <p className="text-center text-amber-500/80 text-sm py-4">Loading data from database...</p>
          ) : (
            <TransactionList transactions={transactions} />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
