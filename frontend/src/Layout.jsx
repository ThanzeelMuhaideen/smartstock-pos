import { Outlet, Link, useLocation } from 'react-router-dom';
import { LogOut } from 'lucide-react'; // Added icon for logout

export default function Layout({ user, handleLogout }) {
  const location = useLocation();

  // We define exactly who is allowed to see which link
  const menuGroups = [
    {
      title: "Store Operations",
      items: [
        { name: 'POS Terminal', path: '/', roles: ['ADMIN', 'CASHIER'] },
        { name: 'Invoices & Returns', path: '/transactions', roles: ['ADMIN', 'CASHIER'] },
        { name: 'Customers & Warranty', path: '/customers', roles: ['ADMIN', 'CASHIER'] },
      ]
    },
    {
      title: "Inventory Control",
      items: [
        { name: 'Product Catalog', path: '/products', roles: ['ADMIN', 'CASHIER'] }, // Cashiers can view, but we'll lock editing later
        { name: 'Stock Intake', path: '/intake', roles: ['ADMIN'] },
        { name: 'Categories & Brands', path: '/categories', roles: ['ADMIN'] },
      ]
    },
    {
      title: "Management & AI",
      items: [
        { name: 'Reports & Analytics', path: '/reports', roles: ['ADMIN'] },
        { name: 'AI Demand Forecast', path: '/ai-insights', roles: ['ADMIN'] },
        { name: 'Settings & Staff', path: '/settings', roles: ['ADMIN'] },
      ]
    }
  ];

  // MAGIC FILTER: This strips out any links the logged-in user isn't allowed to see!
  const allowedGroups = menuGroups.map(group => ({
    ...group,
    items: group.items.filter(item => item.roles.includes(user?.role || 'CASHIER'))
  })).filter(group => group.items.length > 0); // Removes empty group headers

  return (
    <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-xl z-20 shrink-0">
        <div className="p-6 bg-slate-950 border-b border-slate-800">
          <h2 className="text-2xl font-extrabold text-blue-500 tracking-tight">SmartStock</h2>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">AI Showroom POS</p>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-8 overflow-y-auto">
          {allowedGroups.map((group) => (
            <div key={group.title}>
              <h3 className="px-4 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                {group.title}
              </h3>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.name}
                      to={item.path}
                      className={`block px-4 py-2.5 rounded-md transition-all duration-200 text-sm font-medium ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* BOTTOM USER PROFILE & LOGOUT */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between mt-auto">
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-white truncate">{user?.name || "User"}</p>
            <p className="text-xs font-bold text-slate-500 uppercase">{user?.role || "STAFF"}</p>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 bg-slate-800 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-colors"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 h-screen overflow-hidden bg-slate-50 flex flex-col">
        <div className="flex-1 overflow-y-auto p-6 lg:p-8">
          <Outlet />
        </div>
         
      </main>
    </div>
  );
}