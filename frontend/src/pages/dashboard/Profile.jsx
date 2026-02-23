import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function Profile() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Profile Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            User profile management will be implemented here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
