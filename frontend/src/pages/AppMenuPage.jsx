import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import useAuthStore from '@/store/useAuthStore';

async function clearAndUpdate() {
  // 1. Delete every Cache Storage cache (PWA / Workbox caches)
  if ('caches' in window) {
    const names = await caches.keys();
    await Promise.all(names.map((n) => caches.delete(n)));
  }

  // 2. Tell any waiting service worker to activate immediately, then reload
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const reg of registrations) {
      await reg.update();
      if (reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    }
  }

  // 3. Hard-navigate to home — page will load fresh with empty caches
  window.location.href = '/';
}

export default function AppMenuPage() {
  const { isAuthenticated, isAdmin } = useAuthStore();
  const [updating, setUpdating] = useState(false);

  const handleUpdateApp = async () => {
    setUpdating(true);
    try {
      await clearAndUpdate();
    } catch {
      // If anything fails, still navigate home
      window.location.href = '/';
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="max-w-xs w-full space-y-4 px-4">
        <h1 className="text-xl font-semibold text-center">App Menu</h1>

        {/* Update App — visible to everyone */}
        <Button
          variant="outline"
          className="w-full flex items-center justify-center gap-2"
          onClick={handleUpdateApp}
          disabled={updating}
        >
          {updating ? (
            <Spinner size="sm" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {updating ? 'Updating…' : 'Update App'}
        </Button>

        {/* Admin Console — only for admins */}
        {isAuthenticated && isAdmin() && (
          <Link to="/admin">
            <Button className="w-full flex items-center justify-center gap-2">
              <Shield className="h-4 w-4" />
              Admin Console
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
