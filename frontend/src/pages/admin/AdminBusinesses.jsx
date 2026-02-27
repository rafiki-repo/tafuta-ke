import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function AdminBusinesses() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Businesses</h1>
      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Business management — view all businesses, approve pending listings, suspend or reinstate accounts.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
