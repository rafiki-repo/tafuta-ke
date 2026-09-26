import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Building2, BarChart3, CreditCard, Tags, Layers, FileText, Menu, X } from 'lucide-react';
import { Header } from '@/components/Header';
import useAuthStore from '@/store/useAuthStore';

export default function AdminLayout() {
  const location = useLocation();
  const { user } = useAuthStore();
  const [navOpen, setNavOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Users', href: '/admin/users', icon: Users },
    { name: 'Businesses', href: '/admin/businesses', icon: Building2 },
    { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
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

  const currentItem = navigation.find((item) => isActive(item.href));
  const closeNav = () => setNavOpen(false);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Mobile admin section bar — current section + menu trigger, no scrolling past the full nav */}
      <div className="md:hidden sticky top-16 z-30 border-b bg-background">
        <div className="container-safe flex items-center justify-between h-12">
          <div className="flex items-center gap-2 text-sm font-semibold">
            {currentItem && <currentItem.icon className="h-4 w-4 text-primary" />}
            {currentItem?.name || 'Admin'}
          </div>
          <button
            onClick={() => setNavOpen(true)}
            className="p-2 -mr-2 rounded-md hover:bg-accent transition-colors"
            aria-label="Open admin menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="container-safe py-6">
        <div className="flex flex-col md:flex-row gap-6">
          <aside className="hidden md:block w-64 flex-shrink-0">
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

      {/* Mobile admin nav overlay + drawer (slides from the left, distinct from the site drawer on the right) */}
      {navOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-40"
          onClick={closeNav}
          aria-hidden="true"
        />
      )}
      <div
        className={`md:hidden fixed inset-y-0 left-0 z-50 w-72 bg-background shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${
          navOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <span className="font-bold text-lg">Admin Menu</span>
          <button
            onClick={closeNav}
            className="p-1 rounded-md hover:bg-muted transition-colors"
            aria-label="Close admin menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-5 py-5 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={closeNav}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-muted'
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
