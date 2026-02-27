import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function AdminPayments() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Payments</h1>
      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Payment management — view transactions, process refunds, export reports, and manage service subscriptions.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
