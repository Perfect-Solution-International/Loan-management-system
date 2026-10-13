export default function DashboardPage() {
  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Financial Dashboard[cite: 2]</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="p-5 bg-white shadow rounded-lg border-l-4 border-blue-600">
          <p className="text-sm text-slate-500">Total Active Loans</p>
          <h3 className="text-2xl font-bold text-slate-800 mt-1">1,245</h3>
        </div>
        <div className="p-5 bg-white shadow rounded-lg border-l-4 border-green-600">
          <p className="text-sm text-slate-500">Total Disbursed (MTD)</p>
          <h3 className="text-2xl font-bold text-slate-800 mt-1">LKR 14.2M</h3>
        </div>
        <div className="p-5 bg-white shadow rounded-lg border-l-4 border-yellow-500">
          <p className="text-sm text-slate-500">Pending Collections</p>
          <h3 className="text-2xl font-bold text-slate-800 mt-1">LKR 1.8M</h3>
        </div>
        <div className="p-5 bg-white shadow rounded-lg border-l-4 border-red-500">
          <p className="text-sm text-slate-500">Overdue Installments</p>
          <h3 className="text-2xl font-bold text-slate-800 mt-1">48</h3>
        </div>
      </div>

      <div className="bg-white p-6 shadow rounded-lg">
        <h3 className="text-lg font-semibold text-slate-700 mb-4">Recent Loan Activity</h3>
        <p className="text-sm text-slate-500">System is fully operational and tracking daily collections[cite: 2].</p>
      </div>
    </div>
  );
}