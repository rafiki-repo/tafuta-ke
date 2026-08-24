import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Building2, CreditCard, Tags, Layers, FileText } from 'lucide-react';
import { Header } from '@/components/Header';
import useAuthStore from '@/store/useAuthStore';

export default function AdminLayout() {
  const location = useLocation();
  const { user } = useAuthStore();

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Users', href: '/admin/users', icon: Users },
    { name: 'Businesses', href: '/admin/businesses', icon: Building2 },
    { name: 'Categories', href: '/admin/categories', icon: Tags },
    { name: 'Services', href: '/admin/services', icon: Layers },
    { name: 'Invoices', href: '/admin/invoices', icon: FileText },
    { name: 'Payments', href: '/admin/payments', icon: CreditCard },
  ];

  const isActive = (href) => {
    if (href === '/admin') {
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
