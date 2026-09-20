import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Receipt,
  CreditCard,
  Users,
  ChevronLeft,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const navigation = [
  {
    name: 'Dashboard',
    path: '/',
    icon: LayoutDashboard,
  },
  {
    name: 'Expenses',
    path: '/expenses',
    icon: Receipt,
  },
  {
    name: 'Bills',
    path: '/bills',
    icon: CreditCard,
  },
  {
    name: 'Groups',
    path: '/groups',
    icon: Users,
  },
];

const Sidebar = ({ isOpen, onToggle }: SidebarProps) => {
  return (
    <aside
      className={`fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-white/10 bg-slate-950/95 backdrop-blur-xl transition-all duration-300 ${
        isOpen ? 'w-64' : 'w-20'
      }`}
    >
      {/* Logo */}
      <div
        className={`flex h-20 items-center border-b border-white/10 ${
          isOpen ? 'px-6' : 'justify-center'
        }`}
      >
        {isOpen ? (
          <div>
            <div className="text-xl font-bold tracking-tight text-white">
              ROOMMATE
            </div>
            <div className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.2em] text-emerald-400">
              Shared expenses
            </div>
          </div>
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-lg font-bold text-emerald-400">
            R
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2 p-4">
        {navigation.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `group flex items-center rounded-xl transition-all duration-200 ${
                  isOpen
                    ? 'gap-3 px-4 py-3'
                    : 'justify-center px-3 py-3'
                } ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'text-white/45 hover:bg-white/5 hover:text-white'
                }`
              }
              title={!isOpen ? item.name : undefined}
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`h-5 w-5 shrink-0 ${
                      isActive
                        ? 'text-emerald-400'
                        : 'text-white/50 group-hover:text-white'
                    }`}
                  />

                  {isOpen && (
                    <span className="text-sm font-medium">
                      {item.name}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-white/10 p-4">
        <button
          type="button"
          onClick={onToggle}
          className={`flex w-full items-center rounded-xl py-3 text-white/50 transition hover:bg-white/5 hover:text-white ${
            isOpen ? 'justify-end px-4' : 'justify-center'
          }`}
          aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <ChevronLeft
            className={`h-5 w-5 transition-transform duration-300 ${
              isOpen ? '' : 'rotate-180'
            }`}
          />
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;