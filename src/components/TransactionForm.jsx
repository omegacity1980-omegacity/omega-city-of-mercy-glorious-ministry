import React, { useState } from 'react';

function TransactionForm({ onAddTransaction, onClose }) {
  const [type, setType] = useState('income');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amount || !category) return;

    // Send new transaction back to App.jsx
    if (onAddTransaction) {
      onAddTransaction({
        type,
        amount: parseFloat(amount),
        category,
        description,
        date: new Date().toLocaleDateString()
      });
    }

    if (onClose) onClose();
  };

  return (
    <div className="bg-neutral-900 border border-amber-500/30 rounded-2xl p-5 shadow-2xl space-y-4">
      <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
        <h2 className="text-lg font-bold text-amber-400">Record Transaction</h2>
        {onClose && (
          <button 
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-100 text-sm font-semibold"
          >
            ✕ Close
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Transaction Type Selector */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setType('income')}
            className={`py-2 rounded-xl text-xs font-bold transition-all ${
              type === 'income' 
                ? 'bg-amber-500 text-neutral-950 shadow-md' 
                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
            }`}
          >
            + Income
          </button>
          <button
            type="button"
            onClick={() => setType('expense')}
            className={`py-2 rounded-xl text-xs font-bold transition-all ${
              type === 'expense' 
                ? 'bg-rose-500 text-neutral-950 shadow-md' 
                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
            }`}
          >
            - Expense
          </button>
        </div>

        {/* Amount Input */}
        <div>
          <label className="block text-xs text-neutral-400 mb-1 font-medium">
            Amount (₦)
          </label>
          <input
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500/60 rounded-xl p-3 text-neutral-100 placeholder-neutral-600 outline-none text-sm"
            required
          />
        </div>

        {/* Category Input */}
        <div>
          <label className="block text-xs text-neutral-400 mb-1 font-medium">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500/60 rounded-xl p-3 text-neutral-100 outline-none text-sm"
            required
          >
            <option value="" disabled>Select Category</option>
            {type === 'income' ? (
              <>
                <option value="Tithe">Tithe</option>
                <option value="Offering">Offering</option>
                <option value="Special Donation">Special Donation</option>
                <option value="Project Seed">Project Seed</option>
              </>
            ) : (
              <>
                <option value="Welfare">Welfare</option>
                <option value="Utilities">Utilities</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Honorarium">Honorarium</option>
              </>
            )}
          </select>
        </div>

        {/* Description Input */}
        <div>
          <label className="block text-xs text-neutral-400 mb-1 font-medium">
            Description
          </label>
          <input
            type="text"
            placeholder="e.g. Sunday Service Collection"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500/60 rounded-xl p-3 text-neutral-100 placeholder-neutral-600 outline-none text-sm"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold rounded-xl shadow-lg text-sm transition-all active:scale-95"
        >
          Save Transaction
        </button>
      </form>
    </div>
  );
}

export default TransactionForm;

