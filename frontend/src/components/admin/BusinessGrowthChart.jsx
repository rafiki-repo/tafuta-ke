import { useState, useEffect, useCallback } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { adminAPI } from '@/lib/api';

const CHART_COLOR = 'hsl(var(--primary))';
const GRID_COLOR = 'hsl(var(--border))';
const AXIS_COLOR = 'hsl(var(--muted-foreground))';

function formatPeriod(period, granularity) {
  const date = parseISO(period);
  return granularity === 'week' ? format(date, 'MMM d') : format(date, 'MMM yyyy');
}

function formatCount(value) {
  return value.toLocaleString();
}

function ChartTooltip({ active, payload, granularity, view }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
      <div className="text-muted-foreground">{formatPeriod(point.period, granularity)}</div>
      <div className="font-semibold text-popover-foreground">
        {formatCount(view === 'total' ? point.cumulative : point.count)}
        {' '}
        <span className="font-normal text-muted-foreground">
          {view === 'total' ? 'active businesses' : 'new this period'}
        </span>
      </div>
    </div>
  );
}

export function BusinessGrowthChart({ variant = 'full' }) {
  const [granularity, setGranularity] = useState('month');
  const [view, setView] = useState('total');
  const [growth, setGrowth] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isCompact = variant === 'compact';

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminAPI.getBusinessGrowth({ granularity });
      setGrowth(res.data.data.growth);
    } catch {
      setError('Failed to load business growth data.');
    } finally {
      setLoading(false);
    }
  }, [granularity]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Card>
      <CardHeader className={isCompact ? 'pb-2' : undefined}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className={isCompact ? 'text-base' : undefined}>
            Business growth
          </CardTitle>
          {!isCompact && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant={view === 'total' ? 'default' : 'outline'}
                  onClick={() => setView('total')}
                >
                  Total
                </Button>
                <Button
                  size="sm"
                  variant={view === 'new' ? 'default' : 'outline'}
                  onClick={() => setView('new')}
                >
                  New
                </Button>
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant={granularity === 'week' ? 'default' : 'outline'}
                  onClick={() => setGranularity('week')}
                >
                  Week
                </Button>
                <Button
                  size="sm"
                  variant={granularity === 'month' ? 'default' : 'outline'}
                  onClick={() => setGranularity('month')}
                >
                  Month
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className={isCompact ? 'flex h-24 items-center justify-center' : 'flex h-72 items-center justify-center'}>
            <Spinner />
          </div>
        )}
        {!loading && error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {!loading && !error && growth.length === 0 && (
          <p className="text-sm text-muted-foreground">No active businesses yet.</p>
        )}
        {!loading && !error && growth.length > 0 && (
          <ResponsiveContainer width="100%" height={isCompact ? 96 : 288}>
            {view === 'total' ? (
              <AreaChart data={growth} margin={{ top: 4, right: 8, left: isCompact ? -32 : 0, bottom: 0 }}>
                {!isCompact && (
                  <CartesianGrid vertical={false} stroke={GRID_COLOR} strokeWidth={1} />
                )}
                <XAxis
                  dataKey="period"
                  hide={isCompact}
                  tickFormatter={(v) => formatPeriod(v, granularity)}
                  stroke={AXIS_COLOR}
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  hide={isCompact}
                  tickFormatter={formatCount}
                  stroke={AXIS_COLOR}
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                />
                <Tooltip content={<ChartTooltip granularity={granularity} view={view} />} />
                <Area
                  type="monotone"
                  dataKey="cumulative"
                  stroke={CHART_COLOR}
                  strokeWidth={2}
                  fill={CHART_COLOR}
                  fillOpacity={0.1}
                />
              </AreaChart>
            ) : (
              <BarChart data={growth} margin={{ top: 4, right: 8, left: isCompact ? -32 : 0, bottom: 0 }}>
                {!isCompact && (
                  <CartesianGrid vertical={false} stroke={GRID_COLOR} strokeWidth={1} />
                )}
                <XAxis
                  dataKey="period"
                  hide={isCompact}
                  tickFormatter={(v) => formatPeriod(v, granularity)}
                  stroke={AXIS_COLOR}
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  hide={isCompact}
                  tickFormatter={formatCount}
                  stroke={AXIS_COLOR}
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                />
                <Tooltip content={<ChartTooltip granularity={granularity} view={view} />} cursor={{ fill: 'hsl(var(--muted))' }} />
                <Bar dataKey="count" fill={CHART_COLOR} radius={[4, 4, 0, 0]} maxBarSize={24} />
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
