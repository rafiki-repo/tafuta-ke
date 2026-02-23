import { Link } from 'react-router-dom';
import { Menu, User, LogOut } from 'lucide-react';
import { Button } from './ui/Button';
import useAuthStore from '@/store/useAuthStore';

export function Header() {
  const { isAuthenticated, user, logout } = useAuthStore();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container-safe flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center space-x-2">
            <img 
              src="/tafuta-icon.png" 
              alt="Tafuta" 
              className="h-8 w-8"
            />
            <span className="font-bold text-xl">Tafuta</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link to="/search" className="text-sm font-medium hover:text-primary transition-colors">
              Search
            </Link>
            <Link to="/search?category=all" className="text-sm font-medium hover:text-primary transition-colors">
              Categories
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <Link to="/dashboard">
                <Button variant="ghost" size="sm">
                  <User className="h-4 w-4 mr-2" />
                  {user?.full_name || 'Dashboard'}
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={logout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">Login</Button>
              </Link>
              <Link to="/register">
                <Button size="sm">Register</Button>
              </Link>
            </>
          )}

          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
