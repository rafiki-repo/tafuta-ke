import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function Payments() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Payments</h1>
      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Payment management and transaction history will be implemented here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
