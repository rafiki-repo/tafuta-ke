import { BusinessGrowthChart } from '@/components/admin/BusinessGrowthChart';

export default function Analytics() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Analytics</h1>
      <BusinessGrowthChart variant="full" />
    </div>
  );
}
