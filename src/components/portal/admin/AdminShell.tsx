import React, { useEffect, useState } from 'react';
import { useLocation } from '@/lib/router-compat';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  ListOrdered, 
  Package, 
  ClipboardList,
  CreditCard,
  Shield,
  HeartPulse,
  FileCheck2,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';
import LogoutDialog from '@/components/portal/auth/LogoutDialog';

const ADMIN_NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/patients', label: 'Patients', icon: Users },
  { href: '/admin/encounters', label: 'Encounters', icon: HeartPulse },
  { href: '/admin/appointments', label: 'Appointments', icon: Calendar },
  { href: '/admin/queue', label: 'Queue', icon: ListOrdered },
  { href: '/admin/inventory', label: 'Inventory', icon: Package },
  { href: '/admin/orders', label: 'Orders', icon: ClipboardList },
  { href: '/admin/billing', label: 'Billing', icon: CreditCard },
  { href: '/admin/insurance', label: 'Ins. Requests', icon: FileCheck2 },
  { href: '/admin/insurance/plans', label: 'Ins. Plans', icon: ShieldCheck },
  { href: '/admin/messaging', label: 'Messaging', icon: MessageSquare },
];

function AdminSidebar() {
  const [location, setLocation] = useLocation();

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card h-screen sticky top-0">
      <div className="p-6 flex items-center gap-3 border-b border-border">
        <div className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
          <Shield className="w-5 h-5" />
        </div>
        <div>
          <span className="text-base font-bold text-foreground">Admin Portal</span>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">SugboDoc</p>
        </div>
      </div>
      
      <nav className="flex-1 px-3 py-4 space-y-1">
        {ADMIN_NAV_ITEMS.map((item) => {
          const isActive = location === item.href || (item.href !== '/admin' && location.startsWith(item.href));
          return (
            <button
              key={item.href}
              onClick={() => setLocation(item.href)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[40px] ${
                isActive 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
              data-testid={`nav-${item.href.split('/').pop() || 'dashboard'}`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border">
        <LogoutDialog
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors min-h-[40px]"
        />
      </div>
    </aside>
  );
}

function AdminTopBar() {
  const [location] = useLocation();
  const currentItem = ADMIN_NAV_ITEMS.find(item => item.href === location) || 
                     ADMIN_NAV_ITEMS.find(item => item.href !== '/admin' && location.startsWith(item.href));
  
  const title = currentItem ? currentItem.label : 'Admin';
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem('sugbodoc_user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        // ignore
      }
    }
  }, []);

  const initials = user?.name ? user.name.split(/\s+/).map((p: string) => p[0]).join('').slice(0, 2).toUpperCase() : 'AD';

  return (
    <header className="border-b border-border bg-card px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <HeartPulse className="w-5 h-5 text-primary md:hidden" />
        <div>
          <h1 className="text-lg font-bold text-foreground">{title}</h1>
          <p className="text-xs text-muted-foreground hidden sm:block">Healthcare Operations</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden sm:block text-right mr-2">
          <p className="text-xs font-medium text-foreground">{user?.name || 'Administrator'}</p>
          <p className="text-[10px] text-muted-foreground">Admin Role</p>
        </div>
        <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
          {initials}
        </div>
        <LogoutDialog className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors" />
      </div>
    </header>
  );
}

function AdminBottomNav() {
  const [location, setLocation] = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-card pb-safe flex items-center justify-around z-50">
       {ADMIN_NAV_ITEMS.map((item) => {
        const isActive = location === item.href || (item.href !== '/admin' && location.startsWith(item.href));
        return (
          <button
            key={item.href}
            onClick={() => setLocation(item.href)}
            className={`flex flex-col items-center justify-center w-full py-2.5 min-h-[56px] space-y-0.5 transition-colors ${
              isActive ? 'text-primary' : 'text-muted-foreground'
            }`}
            data-testid={`nav-mobile-${item.href.split('/').pop() || 'dashboard'}`}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <AdminSidebar />
      <div className="flex-1 flex flex-col relative w-full h-full">
        <AdminTopBar />
        <main className="flex-1 overflow-y-auto w-full pb-[72px] md:pb-0 scrollbar-thin">
          <div className="max-w-7xl mx-auto w-full h-full p-4 md:p-6">
            {children}
          </div>
        </main>
        <AdminBottomNav />
      </div>
    </div>
  );
}
