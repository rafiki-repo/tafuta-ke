import { Outlet, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function RegisterLayout() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 bg-background border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            aria-label="Back to home"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <Link to="/" className="flex items-center gap-2">
            <img src="/tafuta-icon.png" alt="Tafuta" className="h-7 w-7" />
            <span className="font-bold text-lg">Tafuta</span>
          </Link>

          {/* Spacer to keep logo centred */}
          <div className="w-10" />
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
