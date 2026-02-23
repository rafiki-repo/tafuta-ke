import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function ContentHistory() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Content History</h1>
      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Content version history and rollback functionality will be implemented here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
