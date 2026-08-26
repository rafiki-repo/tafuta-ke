import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, Building2, CreditCard, FileText, User } from 'lucide-react';
import { Header } from '@/components/Header';
import useAuthStore from '@/store/useAuthStore';

export default function DashboardLayout() {
  const location = useLocation();
  const { user } = useAuthStore();

  const navigation = [
    { name: 'Overview', href: '/dashboard', icon: Home },
    { name: 'My Businesses', href: '/dashboard/businesses', icon: Building2 },
    { name: 'Payments', href: '/dashboard/payments', icon: CreditCard },
    { name: 'Invoices', href: '/dashboard/invoices', icon: FileText },
    { name: 'Profile', href: '/dashboard/profile', icon: User },
  ];

  const isActive = (href) => {
    if (href === '/dashboard') {
      return location.pathname === href;
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container-safe py-6">
        <div className="flex flex-col md:flex-row gap-6">
          <aside className="w-full md:w-64 flex-shrink-0">
            <nav className="space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive(item.href)
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </aside>

          <main className="flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
