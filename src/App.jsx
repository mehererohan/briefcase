import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import Module1 from './pages/Module1';
import Module2 from './pages/Module2';
import Module3 from './pages/Module3';

const NAV_ITEMS = [
  { to: '/module1', label: 'Prospect Briefing' },
  { to: '/module2', label: 'Pitch Builder' },
  { to: '/module3', label: 'Call Debrief' },
];

export function AppHeader() {
  return (
    <header className="bg-[#0f172a] px-8 py-5 flex-shrink-0">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Briefcase</h1>
          <p className="text-slate-400 text-sm mt-0.5">GTM intelligence for modern sales teams</p>
        </div>
        <nav className="flex items-center gap-1 pb-0.5">
          {NAV_ITEMS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/module1" replace />} />
        <Route path="/module1" element={<Module1 />} />
        <Route path="/module2" element={<Module2 />} />
        <Route path="/module3" element={<Module3 />} />
      </Routes>
    </BrowserRouter>
  );
}
