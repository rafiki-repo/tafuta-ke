import { Outlet, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function AuthLayout() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header with back button */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container-safe flex h-16 items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Home</span>
          </Button>
          
          <Link to="/" className="flex items-center space-x-2">
            <img 
              src="/tafuta-icon.png" 
              alt="Tafuta" 
              className="h-8 w-8"
            />
            <span className="font-bold text-xl">Tafuta</span>
          </Link>

          <div className="w-24"></div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex">
        <div className="flex-1 flex items-center justify-center p-8 bg-background">
          <div className="w-full max-w-md">
            <Outlet />
          </div>
        </div>
        
        <div className="hidden lg:flex flex-1 bg-primary items-center justify-center p-8">
          <div className="max-w-md text-primary-foreground">
            <h2 className="text-3xl font-bold mb-4">Grow Your Business</h2>
            <p className="text-lg opacity-90">
              Join thousands of Kenyan businesses reaching customers across Machakos, Kisumu, and beyond.
            </p>
            <ul className="mt-8 space-y-4">
              <li className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-primary-foreground/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  ✓
                </div>
                <span>Create your business profile in minutes</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-primary-foreground/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  ✓
                </div>
                <span>Get discovered by local customers</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-primary-foreground/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  ✓
                </div>
                <span>Manage your online presence easily</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
