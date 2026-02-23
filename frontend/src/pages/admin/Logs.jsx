import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function Logs() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">System Logs</h1>
      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Auth logs and audit logs viewer will be implemented here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
