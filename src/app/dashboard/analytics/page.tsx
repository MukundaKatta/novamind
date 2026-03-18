"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useSupabase } from "@/hooks/use-supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  Coins,
  Clock,
  Activity,
  TrendingUp,
  Zap,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { formatCurrency, formatTokens, formatNumber, formatLatency } from "@/lib/utils/format";
import { PROVIDER_COLORS } from "@/lib/llm/models";

interface AnalyticsData {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  avgLatency: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  dailyUsage: { date: string; requests: number; tokens: number; cost: number }[];
  modelBreakdown: { model: string; provider: string; requests: number; tokens: number; cost: number }[];
  latencyPercentiles: { date: string; p50: number; p95: number; p99: number }[];
}

const COLORS = ["#8b5cf6", "#ec4899", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

export default function AnalyticsPage() {
  const supabase = useSupabase();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState("7d");
  const [loading, setLoading] = useState(true);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const daysBack = timeRange === "24h" ? 1 : timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
    const since = new Date(Date.now() - daysBack * 86400000).toISOString();

    const { data: logs } = await supabase
      .from("api_request_logs")
      .select("*")
      .eq("user_id", user.id)
      .gte("created_at", since)
      .order("created_at", { ascending: true });

    if (!logs) {
      setLoading(false);
      return;
    }

    // Aggregate data
    const totalRequests = logs.length;
    const totalTokens = logs.reduce((sum, l) => sum + l.tokens_total, 0);
    const totalCost = logs.reduce((sum, l) => sum + Number(l.cost), 0);
    const latencies = logs.map((l) => l.latency_ms).sort((a, b) => a - b);
    const avgLatency = latencies.length > 0
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length
      : 0;

    const percentile = (arr: number[], p: number) => {
      if (arr.length === 0) return 0;
      const idx = Math.ceil((p / 100) * arr.length) - 1;
      return arr[Math.max(0, idx)];
    };

    const p50Latency = percentile(latencies, 50);
    const p95Latency = percentile(latencies, 95);
    const p99Latency = percentile(latencies, 99);

    // Daily usage
    const dailyMap = new Map<string, { requests: number; tokens: number; cost: number }>();
    for (const log of logs) {
      const date = new Date(log.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const existing = dailyMap.get(date) || { requests: 0, tokens: 0, cost: 0 };
      dailyMap.set(date, {
        requests: existing.requests + 1,
        tokens: existing.tokens + log.tokens_total,
        cost: existing.cost + Number(log.cost),
      });
    }
    const dailyUsage = Array.from(dailyMap.entries()).map(([date, vals]) => ({
      date,
      ...vals,
    }));

    // Model breakdown
    const modelMap = new Map<string, { provider: string; requests: number; tokens: number; cost: number }>();
    for (const log of logs) {
      const existing = modelMap.get(log.model) || { provider: log.provider, requests: 0, tokens: 0, cost: 0 };
      modelMap.set(log.model, {
        provider: log.provider,
        requests: existing.requests + 1,
        tokens: existing.tokens + log.tokens_total,
        cost: existing.cost + Number(log.cost),
      });
    }
    const modelBreakdown = Array.from(modelMap.entries())
      .map(([model, vals]) => ({ model, ...vals }))
      .sort((a, b) => b.requests - a.requests);

    // Daily latency percentiles
    const dailyLatencyMap = new Map<string, number[]>();
    for (const log of logs) {
      const date = new Date(log.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const existing = dailyLatencyMap.get(date) || [];
      existing.push(log.latency_ms);
      dailyLatencyMap.set(date, existing);
    }
    const latencyPercentiles = Array.from(dailyLatencyMap.entries()).map(
      ([date, latArr]) => {
        const sorted = latArr.sort((a, b) => a - b);
        return {
          date,
          p50: percentile(sorted, 50),
          p95: percentile(sorted, 95),
          p99: percentile(sorted, 99),
        };
      }
    );

    setData({
      totalRequests,
      totalTokens,
      totalCost,
      avgLatency,
      p50Latency,
      p95Latency,
      p99Latency,
      dailyUsage,
      modelBreakdown,
      latencyPercentiles,
    });
    setLoading(false);
  }, [supabase, timeRange]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Usage Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor token consumption, costs, and latency
          </p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">Last 24h</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Requests
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(data?.totalRequests || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Tokens
            </CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatTokens(data?.totalTokens || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Cost
            </CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data?.totalCost || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Latency
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatLatency(data?.avgLatency || 0)}
            </div>
            <div className="flex gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                P50: {formatLatency(data?.p50Latency || 0)}
              </Badge>
              <Badge variant="outline" className="text-xs">
                P95: {formatLatency(data?.p95Latency || 0)}
              </Badge>
              <Badge variant="outline" className="text-xs">
                P99: {formatLatency(data?.p99Latency || 0)}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Daily Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Daily Requests & Tokens</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data?.dailyUsage || []}>
                <defs>
                  <linearGradient id="tokenGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 11 }} />
                <YAxis className="text-xs" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="tokens"
                  stroke="#8b5cf6"
                  fill="url(#tokenGrad)"
                  name="Tokens"
                />
                <Bar dataKey="requests" fill="#ec4899" name="Requests" opacity={0.7} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Cost Over Time */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Daily Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data?.dailyUsage || []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 11 }} />
                <YAxis className="text-xs" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v.toFixed(2)}`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value: number) => [`$${value.toFixed(4)}`, "Cost"]}
                />
                <Bar dataKey="cost" fill="#10b981" radius={[4, 4, 0, 0]} name="Cost ($)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Latency Percentiles */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Latency Percentiles (P50/P95/P99)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data?.latencyPercentiles || []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 11 }} />
                <YAxis className="text-xs" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}ms`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value: number) => [`${value}ms`]}
                />
                <Legend />
                <Line type="monotone" dataKey="p50" stroke="#10b981" name="P50" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="p95" stroke="#f59e0b" name="P95" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="p99" stroke="#ef4444" name="P99" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Model Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Usage by Model</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.modelBreakdown && data.modelBreakdown.length > 0 ? (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width="50%" height={250}>
                  <PieChart>
                    <Pie
                      data={data.modelBreakdown}
                      dataKey="requests"
                      nameKey="model"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={40}
                    >
                      {data.modelBreakdown.map((_, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {data.modelBreakdown.slice(0, 6).map((item, idx) => (
                    <div key={item.model} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                        />
                        <span className="truncate max-w-[140px]">{item.model}</span>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <div>{formatNumber(item.requests)} req</div>
                        <div>{formatCurrency(item.cost)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
                No data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
