"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import axiosInstance from "@/config/axiosInstance";
import { getConfig } from "@/store/slicer";
import SummaryCards from "@/components/ui/SummaryCards";

// ─── Types ─────────────────────────────────────────────────────────────────

interface MonthlyRevenue {
  month: string;
  year: number;
  revenue: number;
}

interface ContentBreakdown {
  text: number;
  quiz: number;
  video: number;
}
interface SummaryCardItem {
  label: string;
  value: string | number;
  icon: string;
}
interface Summary {
  totalUsers: number;
  totalContent: number;
  totalQuizAttempts: number;
  totalWinners: number;
  totalRevenue: number;
}

interface TopWinner {
  _id: string;
  userId: string;
  rank: number;
  score: number;
  weekNumber: number;
  year: number;
  cycleType: string;
  userName: string;
  profilePicture: string | null;
}

interface TopSubscriber {
  _id: string;
  userId: string;
  planName: string;
  price: number;
  status: string;
  startDate: string;
  expiryDate: string;
  userName: string;
  profilePicture: string | null;
  userEmail: string;
}

interface DashboardData {
  summary: Summary;
  revenueStats: {
    monthly: MonthlyRevenue[];
    total: number;
  };
  contentStats: {
    breakdown: ContentBreakdown;
  };
  topWinners: TopWinner[];
  topSubscribers: TopSubscriber[];
}

// ─── Constants ──────────────────────────────────────────────────────────────

const CONTENT_COLORS = ["#6366F1", "#10B981", "#F59E0B"];
const CONTENT_LABELS = { text: "Text", quiz: "Quiz", video: "Video" };

const RANK_CONFIG: Record<number, { bg: string; text: string; label: string }> = {
  1: { bg: "bg-amber-50",   text: "text-amber-600",  label: "🥇" },
  2: { bg: "bg-gray-100",   text: "text-gray-500",   label: "🥈" },
  3: { bg: "bg-orange-50",  text: "text-orange-500", label: "🥉" },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const formatExpiry = (iso: string) => {
  const diff = Math.ceil(
    (new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (diff < 0) return "Expired";
  if (diff === 0) return "Expires today";
  return `${diff}d left`;
};

const getSubStatusStyle = (status: string) => {
  switch (status) {
    case "active":     return "bg-green-50 text-green-700";
    case "trial":      return "bg-blue-50 text-blue-700";
    case "expired":    return "bg-red-50 text-red-700";
    case "cancelled":  return "bg-gray-100 text-gray-500";
    default:           return "bg-gray-100 text-gray-500";
  }
};

const initials = (name: string) =>
  name
    ?.split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "?";

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  sub,
  iconBg,
  iconColor,
}: {
  icon: string;
  label: string;
  value: string | number;
  sub?: string;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
        <Icon icon={icon} className={`w-6 h-6 ${iconColor}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5 truncate">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function Avatar({
  src,
  name,
  size = "md",
}: {
  src: string | null;
  name: string;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "w-7 h-7 text-xs" : "w-9 h-9 text-sm";
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${dim} rounded-full object-cover shrink-0`}
      />
    );
  }
  return (
    <div
      className={`${dim} rounded-full bg-indigo-100 text-indigo-700 font-semibold flex items-center justify-center shrink-0`}
    >
      {initials(name)}
    </div>
  );
}

function SectionCard({
  title,
  icon,
  children,
  empty,
  emptyText = "No data available",
}: {
  title: string;
  icon: string;
  children?: React.ReactNode;
  empty?: boolean;
  emptyText?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <Icon icon={icon} className="w-4 h-4 text-gray-400" />
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>
      {empty ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-300">
          <Icon icon="mdi:inbox-outline" className="w-10 h-10 mb-2" />
          <p className="text-sm">{emptyText}</p>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 lg:p-6 space-y-6">
      <div className="flex justify-between">
        <div className="h-9 w-52 bg-gray-200 rounded-lg animate-pulse" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-24 bg-white rounded-2xl animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-80 bg-white rounded-2xl animate-pulse" />
        <div className="h-80 bg-white rounded-2xl animate-pulse" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-64 bg-white rounded-2xl animate-pulse" />
        <div className="h-64 bg-white rounded-2xl animate-pulse" />
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function DashboardOverview(): React.JSX.Element {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await axiosInstance.get("/dashboard", getConfig());
        if (res.data.success) {
          setData(res.data.data as DashboardData);
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    void fetchData();
  }, []);

  if (loading) return <Skeleton />;

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-center">
          <Icon icon="mdi:alert-circle-outline" className="w-16 h-16 text-gray-300 mx-auto" />
          <p className="mt-4 text-gray-500 font-medium">Failed to load dashboard</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-5 py-2 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-700 transition-colors"
            type="button"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { summary, revenueStats, contentStats, topWinners, topSubscribers } = data;

  // Content donut data
  const contentDonutData = [
    { name: "Text",  value: contentStats.breakdown.text  },
    { name: "Quiz",  value: contentStats.breakdown.quiz  },
    { name: "Video", value: contentStats.breakdown.video },
  ].filter((d) => d.value > 0);

  const totalContent = contentStats.breakdown.text + contentStats.breakdown.quiz + contentStats.breakdown.video;

  // Revenue chart — only show months with label
  const revenueChartData = revenueStats.monthly.map((m) => ({
    label: m.month,
    revenue: m.revenue,
  }));

const summaryCards: SummaryCardItem[] = [
  {
    label: "Total Users",
    value: `${summary.totalUsers.toLocaleString()}`,
    icon: "mdi:account-group-outline",
  },
  {
    label: "Total Content",
    value: summary.totalContent,
    icon: "mdi:file-document-outline",
  },
  {
    label: "Total Winners",
    value: summary.totalWinners,
    icon: "mdi:trophy-outline",
  },
  {
    label: "Total Revenue",
    value: summary.totalRevenue,
    icon: "mdi:currency-usd",
  },
];
  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 lg:p-6 space-y-6">

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-0.5">Platform overview at a glance</p>
      </div>

         <SummaryCards data={summaryCards as any} />


      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Revenue Line/Bar Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Revenue Overview</h3>
              <p className="text-xs text-gray-400 mt-0.5">Monthly subscription revenue (last 12 months)</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500 inline-block" />
              Revenue (₹)
            </div>
          </div>

          {revenueStats.monthly.every((m) => m.revenue === 0) ? (
            <div className="flex items-center justify-center h-60 text-gray-300 text-sm">
              No revenue data yet
            </div>
          ) : (
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueChartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    dy={8}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    tickFormatter={(v: number) => v === 0 ? "0" : `₹${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
                    width={50}
                  />
                  {/* @ts-ignore */}
                  <Tooltip
                    contentStyle={{
                      borderRadius: "10px",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                      padding: "8px 12px",
                      backgroundColor: "#fff",
                      fontSize: 13,
                    }}
                    formatter={(value: any) => value ? [`₹${value.toLocaleString()}`, "Revenue"] : ["", "Revenue"]}
                    labelStyle={{ fontWeight: 600, color: "#1e293b", marginBottom: 2 }}
                    cursor={{ fill: "#f8fafc" }}
                  />
                  <Bar dataKey="revenue" fill="#6366F1" radius={[6, 6, 0, 0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Content Donut Chart */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-gray-900">Content Breakdown</h3>
            <p className="text-xs text-gray-400 mt-0.5">By content type</p>
          </div>

          {totalContent === 0 ? (
            <div className="flex items-center justify-center h-52 text-gray-300 text-sm">
              No content yet
            </div>
          ) : (
            <>
              <div className="relative h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={contentDonutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {contentDonutData.map((_, i) => (
                        <Cell key={i} fill={CONTENT_COLORS[i % CONTENT_COLORS.length]} />
                      ))}
                    </Pie>
                    {/* @ts-ignore */}
                    <Tooltip
                      contentStyle={{
                        borderRadius: "10px",
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        fontSize: 13,
                      }}
                      formatter={(value: any, name: any) => [value || 0, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-2xl font-bold text-gray-900">{totalContent}</p>
                  <p className="text-xs text-gray-400">Total</p>
                </div>
              </div>

              {/* Legend */}
              <div className="mt-3 grid grid-cols-3 gap-2">
                {contentDonutData.map((item, i) => (
                  <div key={item.name} className="flex flex-col items-center gap-1">
                    <div
                      className="w-2.5 h-2.5 rounded-sm"
                      style={{ backgroundColor: CONTENT_COLORS[i] }}
                    />
                    <span className="text-xs text-gray-500">{item.name}</span>
                    <span className="text-sm font-semibold text-gray-900">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Tables Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Top Winners */}
        <SectionCard
          title="Top Winners — Latest Week"
          icon="mdi:trophy-outline"
          empty={topWinners.length === 0}
          emptyText="No winners announced yet"
        >
          <div className="divide-y divide-gray-50">
            {topWinners.map((winner) => {
              const rankCfg = RANK_CONFIG[winner.rank] ?? {
                bg: "bg-gray-100",
                text: "text-gray-500",
                label: `#${winner.rank}`,
              };
              return (
                <div key={winner._id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/60 transition-colors">
                  {/* Rank badge */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0 ${rankCfg.bg}`}>
                    {rankCfg.label}
                  </div>

                  {/* Avatar */}
                  <Avatar src={winner.profilePicture} name={winner.userName} />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{winner.userName}</p>
                    <p className="text-xs text-gray-400">
                      Week {winner.weekNumber} · {winner.year}
                    </p>
                  </div>

                  {/* Score */}
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-indigo-600">{winner.score}</p>
                    <p className="text-xs text-gray-400">correct</p>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        {/* Top Subscribers */}
        <SectionCard
          title="Recent Subscribers"
          icon="mdi:star-circle-outline"
          empty={topSubscribers.length === 0}
          emptyText="No subscribers yet"
        >
          <div className="divide-y divide-gray-50">
            {topSubscribers.map((sub) => (
              <div key={sub._id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/60 transition-colors">
                {/* Avatar */}
                <Avatar src={sub.profilePicture} name={sub.userName} />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{sub.userName}</p>
                  <p className="text-xs text-gray-400 truncate">{sub.userEmail}</p>
                </div>

                {/* Plan + status */}
                <div className="text-right shrink-0 space-y-1">
                  <p className="text-xs font-semibold text-gray-700">
                    ₹{sub.price}
                    <span className="font-normal text-gray-400"> / mo</span>
                  </p>
                  <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium capitalize ${getSubStatusStyle(sub.status)}`}>
                    {sub.status}
                  </span>
                </div>

                {/* Expiry */}
                <div className="shrink-0 text-right hidden sm:block">
                  <p className="text-xs text-gray-400">
                    {formatExpiry(sub.expiryDate)}
                  </p>
                  <p className="text-xs text-gray-300">{formatDate(sub.startDate)}</p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

      </div>
    </div>
  );
}