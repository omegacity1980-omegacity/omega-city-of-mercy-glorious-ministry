import React from 'react';

function TransactionList({ transactions = [] }) {
  if (transactions.length === 0) {
    return (
      <div className="bg-neutral-900/50 border border-neutral-800/80 rounded-2xl p-6 text-center space-y-1">
        <p className="text-sm font-medium text-neutral-400">No transactions recorded yet</p>
        <p className="text-xs text-neutral-600">Tap "+ Record Income" or "- Record Expense" to start.</p>
      </div>
    );
  }

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 space-y-3 shadow-xl">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400 border-b border-neutral-800 pb-2">
        Recent Activity
      </h3>
      <div className="divide-y divide-neutral-800">
        {transactions.map((item, index) => (
          <div key={index} className="py-3 flex justify-between items-center first:pt-1 last:pb-1">
            <div className="flex items-center space-x-3">
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                  item.type === 'income' 
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' 
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                }`}
              >
                {item.type === 'income' ? '+' : '-'}
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-200">{item.category}</p>
                {item.description && (
                  <p className="text-xs text-neutral-500">{item.description}</p>
                )}
              </div>
            </div>
            <p className={`text-sm font-bold ${
              item.type === 'income' ? 'text-amber-400' : 'text-rose-400'
            }`}>
              {item.type === 'income' ? '+' : '-'}₦{Number(item.amount).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TransactionList;

