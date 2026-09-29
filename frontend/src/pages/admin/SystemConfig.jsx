import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { adminAPI } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/Alert';

export default function SystemConfig() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const runRegeneratePhotoSizes = async () => {
    setRunning(true);
    setResult(null);
    setError('');
    try {
      const response = await adminAPI.regeneratePhotoSizes({});
      setResult(response.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to regenerate photo sizes');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">System Configuration</h1>

      <Card>
        <CardHeader>
          <CardTitle>Maintenance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold mb-1">Regenerate Photo Sizes</h3>
              <p className="text-sm text-muted-foreground max-w-xl">
                Re-renders every business logo, banner, profile, and gallery photo at
                the sizes currently defined in app-config.jfx, using each photo's
                original file and its saved edits (crop, zoom, brightness, etc).
                Run this after adding or changing a size in that config so existing
                photos get the new size — new uploads always get it automatically.
                Sizes that already exist on disk are left alone.
              </p>
            </div>
            <Button onClick={runRegeneratePhotoSizes} disabled={running} className="shrink-0">
              {running ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Running...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Run Now
                </>
              )}
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result && (
            <Alert variant={result.failed > 0 ? 'destructive' : 'success'}>
              <AlertTitle>Done</AlertTitle>
              <AlertDescription>
                <p>
                  Generated {result.generated}, skipped {result.skipped} (already existed), failed {result.failed}.
                </p>
                {result.errors?.length > 0 && (
                  <ul className="mt-2 list-disc list-inside text-sm space-y-0.5 max-h-40 overflow-y-auto">
                    {result.errors.map((msg, idx) => (
                      <li key={idx}>{msg}</li>
                    ))}
                  </ul>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
