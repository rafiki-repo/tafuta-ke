import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, User, LogOut, Globe, Shield } from 'lucide-react';
import { Button } from './ui/Button';
import useAuthStore from '@/store/useAuthStore';
import { useLanguage, LANGUAGES } from '@/context/LanguageContext';

export function Header() {
  const { isAuthenticated, user, logout, isAdmin } = useAuthStore();
  const { lang, setLang } = useLanguage();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const currentLang = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];

  const close = () => setDrawerOpen(false);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container-safe flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <img src="/tafuta-icon.png" alt="Tafuta" className="h-8 w-8" />
            <span className="font-bold text-xl">Tafuta</span>
          </Link>

          {/* Right side: desktop auth + hamburger */}
          <div className="flex items-center gap-2">
            {/* Authenticated: show compact nav inline */}
            {isAuthenticated && (
              <Link to="/dashboard" className="hidden md:block">
                <Button variant="ghost" size="sm">
                  <User className="h-4 w-4 mr-2" />
                  {user?.full_name || 'Dashboard'}
                </Button>
              </Link>
            )}

            {/* Language indicator pill */}
            <button
              onClick={() => setDrawerOpen(true)}
              className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Language / Menu"
            >
              <Globe className="h-4 w-4" />
              {currentLang.label}
            </button>

            {/* Hamburger — always visible */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 transition-opacity"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* Right-side Drawer */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-72 bg-background shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${
          drawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <Link to="/" onClick={close} className="flex items-center gap-2">
            <img src="/tafuta-icon.png" alt="Tafuta" className="h-7 w-7" />
            <span className="font-bold text-lg">Tafuta</span>
          </Link>
          <button
            onClick={close}
            className="p-1 rounded-md hover:bg-muted transition-colors"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Drawer body — scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">

          {/* Language Section */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Language
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    lang === l.code
                      ? 'bg-primary text-white'
                      : 'bg-muted/50 text-foreground hover:bg-muted'
                  }`}
                >
                  {l.label}
                  {lang === l.code && (
                    <span className="text-xs opacity-75">✓</span>
                  )}
                </button>
              ))}
            </div>
          </section>

          {/* Divider */}
          <div className="border-t" />

          {/* Auth Section */}
          <section>
            <div className="flex flex-col gap-1.5">
              {isAuthenticated ? (
                <>
                  <Link to="/dashboard" onClick={close}>
                    <button className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-muted transition-colors">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {user?.full_name || 'Dashboard'}
                    </button>
                  </Link>

                  {/* Admin Panel — only visible to Tafuta staff */}
                  {isAdmin() && (
                    <Link to="/admin" onClick={close}>
                      <button className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                        <Shield className="h-4 w-4" />
                        Admin Panel
                      </button>
                    </Link>
                  )}

                  <button
                    onClick={() => { logout(); close(); }}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-muted transition-colors text-destructive"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={close}>
                    <button className="flex items-center justify-center w-full px-3 py-2.5 rounded-lg text-sm font-semibold border border-border hover:bg-muted transition-colors">
                      Login
                    </button>
                  </Link>
                  <Link to="/register" onClick={close}>
                    <button className="flex items-center justify-center w-full px-3 py-2.5 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition-colors">
                      List Your Business
                    </button>
                  </Link>
                </>
              )}
            </div>
          </section>

        </div>

        {/* Drawer footer */}
        <div className="px-5 py-4 border-t text-center">
          <p className="text-xs text-muted-foreground">
            eBiashara Rahisi Ltd &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </>
  );
}
