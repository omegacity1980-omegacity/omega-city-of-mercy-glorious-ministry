import React from 'react';

function App() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 space-y-6">
      {/* App Header */}
      <header className="max-w-md mx-auto bg-neutral-900 border border-amber-500/30 rounded-2xl p-6 shadow-xl text-center space-y-2">
        <div className="inline-block px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-400 text-xs font-semibold uppercase tracking-wider">
          Glorious Ministry
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-amber-400">
          Omega City of Mercy
        </h1>
        <p className="text-xs text-neutral-400">
          Financial Record & Administrative Portal
        </p>
      </header>

      {/* Financial Summary Cards */}
      <main className="max-w-md mx-auto space-y-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex justify-between items-center shadow-md">
          <div>
            <p className="text-xs text-neutral-400">Total Income</p>
            <p className="text-xl font-bold text-amber-400">₦0.00</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
            +
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex justify-between items-center shadow-md">
          <div>
            <p className="text-xs text-neutral-400">Total Expenses</p>
            <p className="text-xl font-bold text-rose-400">₦0.00</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 font-bold">
            -
          </div>
        </div>

        <div className="bg-neutral-900 border border-amber-500/40 rounded-xl p-4 flex justify-between items-center shadow-lg bg-gradient-to-r from-neutral-900 via-neutral-900 to-amber-950/30">
          <div>
            <p className="text-xs text-amber-300 font-medium">Net Balance</p>
            <p className="text-2xl font-extrabold text-amber-400">₦0.00</p>
          </div>
          <div className="text-amber-400 font-bold text-lg">
            ₦
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold rounded-xl shadow-md text-sm transition-all active:scale-95">
            + Record Income
          </button>
          <button className="w-full py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 font-bold rounded-xl shadow-md text-sm transition-all active:scale-95">
            - Record Expense
          </button>
        </div>
      </main>
    </div>
  );
}

export default App;

