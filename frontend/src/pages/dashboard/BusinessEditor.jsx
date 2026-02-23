import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function BusinessEditor() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Business Editor</h1>
      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Business editor with JSON content management will be implemented here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
