import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Send,
  Users,
  FileText,
  Smartphone,
  Activity,
  MessageSquare,
} from 'lucide-react';

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/campaigns', label: 'Campaigns', icon: Send },
  { to: '/contacts', label: 'Contacts', icon: Users },
  { to: '/templates', label: 'Templates', icon: FileText },
  { to: '/accounts', label: 'Accounts', icon: Smartphone },
  { to: '/messages', label: 'Messages', icon: MessageSquare },
  { to: '/logs', label: 'Logs & Analytics', icon: Activity },
];

export default function AppSidebar() {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-60 bg-sidebar flex flex-col z-30">
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-sidebar-border">
        <MessageSquare className="w-6 h-6 text-sidebar-primary" />
        <span className="text-base font-semibold text-sidebar-accent-foreground tracking-tight">
          OutreachFlow
        </span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {links.map(({ to, label, icon: Icon }) => {
          const active = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
          return (
            <NavLink
              key={to}
              to={to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
              }`}
            >
              <Icon className="w-[18px] h-[18px]" />
              {label}
            </NavLink>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-sidebar-border">
        <p className="text-xs text-sidebar-foreground/60">
          WhatsApp Outreach Automation
        </p>
      </div>
    </aside>
  );
}
