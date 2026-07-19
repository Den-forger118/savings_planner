import { useState } from 'react';
import AdminDashboardPage from './AdminDashboardPage';
import AdminUsersPage from './AdminUsersPage';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'members', label: 'Members' },
];

function AdminPage() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-cream pb-4">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-lg px-4 py-2 font-sans text-[10px] font-normal uppercase tracking-[0.14em] transition-colors ${
              activeTab === tab.id
                ? 'bg-primary-dark text-cream'
                : 'bg-cream/50 text-taupe hover:bg-cream hover:text-primary-dark'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' ? <AdminDashboardPage /> : <AdminUsersPage />}
    </div>
  );
}

export default AdminPage;
