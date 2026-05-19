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
import { getConfig } from "@/store/slicer";
import axiosInstance from "@/config/axiosInstance";
import SummaryCard from "@/components/ui/SummaryCards";
import { CustomDropdown } from "@/components/ui/Dropdown";
import { useRouter } from "next/navigation";


interface RevenueChartItem {
  month: string;
  revenue: number;
  jobs: number;
}

interface JobStatusChartItem {
  status: string;
  value: number;
}

interface RecentJob {
  _id: string;
  serviceName: string;
  customerName: string;
  providerName: string;
  amount: number;
  status: string;
  createdAt: string;
}

interface MainStats {
  totalRevenue: number;
  totalJobs: number;
  totalProviders: number;
  totalCustomers: number;
}

interface DashboardCharts {
  revenueChart: RevenueChartItem[];
  jobStatusChart: JobStatusChartItem[];
}

interface DashboardData {
  filterApplied: string;
  mainStats: MainStats;
  charts: DashboardCharts;
  recentJobs: RecentJob[];
}

interface SummaryCardItem {
  label: string;
  value: string | number;
  icon: string;
}

interface FilterOption {
  value: string;
  label: string;
}


const DONUT_COLORS: string[] = ["#e05a00", "#F59E0B", "#10B981", "#6366F1", "#8B5CF6"];

const filterOptions: FilterOption[] = [
  { value: "thisMonth", label: "This Month" },
  { value: "lastMonth", label: "Last Month" },
  { value: "lastYear", label: "Last Year" },
];

const TABLE_COLUMNS = ["Service", "Customer", "Provider", "Amount", "Status", "Date"] as const;


const formatStatus = (status: string): string => {
  switch (status) {
    case "confirmed_by_user":
      return "Confirmed";
    case "pending":
      return "Pending";
    case "in_progress":
      return "In Progress";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case "confirmed_by_user":
      return "bg-emerald-50 text-emerald-700";
    case "pending":
      return "bg-amber-50 text-amber-700";
    case "in_progress":
      return "bg-blue-50 text-blue-700";
    case "completed":
      return "bg-green-50 text-green-700";
    case "cancelled":
      return "bg-red-50 text-red-700";
    default:
      return "bg-gray-50 text-gray-700";
  }
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function DashboardOverview(): React.JSX.Element {
  //  All hooks called at the top level - before any conditional returns
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<string>("thisMonth");

  useEffect(() => {
    const fetchDashboardData = async (): Promise<void> => {
      setLoading(true);
      try {
        const response = await axiosInstance.get("/dashboard/stats", {
          params: { period: filter },
          ...getConfig(),
        });
        if (response.data.success) {
          setData(response.data.data as DashboardData);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        setLoading(false);
      }
    };

    void fetchDashboardData();
  }, [filter]);

  //  Now conditional returns are safe - hooks are already called
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
          <div className="h-10 w-48 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-10 w-full sm:w-36 bg-gray-200 rounded-xl animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-white rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          <div className="h-96 bg-white rounded-3xl animate-pulse" />
          <div className="h-96 bg-white rounded-3xl animate-pulse" />
        </div>
        <div className="h-80 bg-white rounded-3xl animate-pulse" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-center">
          <Icon icon="mdi:alert-circle-outline" className="w-16 h-16 text-gray-400 mx-auto" />
          <p className="mt-4 text-gray-600">Failed to load dashboard data</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ── Derived data ──────────────────────────────────────────────────────────

  const { mainStats, charts, recentJobs } = data;

  const summaryCards: SummaryCardItem[] = [
    {
      label: "Total Revenue",
      value: `${mainStats.totalRevenue.toLocaleString()}`,
      icon: "mdi:currency-bdt",
    },
    {
      label: "Total Jobs",
      value: mainStats.totalJobs,
      icon: "mdi:briefcase-outline",
    },
    {
      label: "Active Providers",
      value: mainStats.totalProviders,
      icon: "mdi:account-hard-hat",
    },
    {
      label: "Total Customers",
      value: mainStats.totalCustomers,
      icon: "mdi:account-group-outline",
    },
  ];

  // Ensure chart has minimum dimensions to prevent Recharts warning
  const hasRevenueData = charts.revenueChart && charts.revenueChart.length > 0;
  const hasJobStatusData = charts.jobStatusChart && charts.jobStatusChart.length > 0;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4  lg:p-6 space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight">
            Dashboard Overview
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Monitor platform performance and growth
          </p>
        </div>
        <div className="w-full sm:w-52 flex-shrink-0">
          <CustomDropdown
            icon="mdi:filter-variant"
            placeholder="Select Period"
            options={filterOptions}
            value={filter}
            onChange={(val: any) => setFilter(val)}
          />
        </div>
      </div>

      {/* Summary Cards */}
      <SummaryCard data={summaryCards as any} />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {/* Revenue Bar Chart */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 sm:mb-6">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                Revenue Overview
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                Monthly revenue performance
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-medium flex-shrink-0">
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: "#e05a00" }}
              />
              <span className="text-gray-600">Revenue (BDT)</span>
            </div>
          </div>

          {!hasRevenueData ? (
            <div className="flex items-center justify-center h-64 sm:h-80 text-gray-400">
              No revenue data available
            </div>
          ) : (
            <div className="h-64 sm:h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={charts.revenueChart}
                  margin={{ top: 10, right: 4, left: 0, bottom: 10 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e2e8f0"
                  />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    tickFormatter={(value: number) => String(value)}
                    width={45}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      padding: "8px 12px",
                      backgroundColor: "#fff",
                    }}
                    formatter={(value: any) => [`BDT ${value}`, "Revenue"]}
                    labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                  />
                  <Bar
                    dataKey="revenue"
                    fill="#e05a00"
                    radius={[8, 8, 0, 0]}
                    barSize={32}
                    name="Revenue"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Job Status Donut Chart */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">
            Job Status Distribution
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 mb-5 sm:mb-6">
            Current job status breakdown
          </p>
          <div className="h-56 sm:h-72 w-full relative">
            {!hasJobStatusData ? (
              <div className="flex items-center justify-center h-full text-gray-400">
                No job status data available
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={charts.jobStatusChart}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                      nameKey="status"
                      stroke="none"
                    >
                      {charts.jobStatusChart.map((entry: JobStatusChartItem, index: number) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={DONUT_COLORS[index % DONUT_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "none",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      }}
                      formatter={(value: any, name: any) => [value, formatStatus(name)]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">
                    {mainStats.totalJobs}
                  </p>
                  <p className="text-xs text-gray-500 font-medium">Total Jobs</p>
                </div>
              </>
            )}
          </div>
          {hasJobStatusData && (
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6 mt-3 pt-2">
              {charts.jobStatusChart.map((item: JobStatusChartItem, index: number) => (
                <div key={item.status} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: DONUT_COLORS[index % DONUT_COLORS.length] }}
                  />
                  <span className="text-xs sm:text-sm text-gray-600 capitalize">
                    {formatStatus(item.status)}
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-gray-900">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Jobs Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Icon icon="mdi:history" className="w-5 h-5 text-gray-500 flex-shrink-0" />
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Recent Jobs</h3>
          </div>
          <button
            onClick={() => router.push("/dashboard/jobs")}
            className="text-sm font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1 self-start sm:self-auto"
            type="button"
          >
            <span>View All</span>
            <Icon icon="mdi:arrow-right" className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          {recentJobs.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <Icon icon="mdi:inbox-outline" className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No recent jobs found</p>
            </div>
          ) : (
            <table className="w-full min-w-[640px]">
              <thead className="bg-gray-50/80">
                <tr>
                  {TABLE_COLUMNS.map((col) => (
                    <th
                      key={col}
                      className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentJobs.map((job: RecentJob) => (
                  <tr key={job._id} className="hover:bg-gray-50/50 transition-colors">
                    {/* Service */}
                    <td className="px-4 sm:px-6 py-3 sm:py-4">
                      <div className="flex items-center gap-2">
                        <Icon
                          icon="mdi:briefcase-outline"
                          className="w-4 h-4 text-gray-400 flex-shrink-0"
                        />
                        <span className="text-sm font-medium text-gray-900 whitespace-nowrap">
                          {job.serviceName}
                        </span>
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="px-4 sm:px-6 py-3 sm:py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-medium text-blue-700">
                            {job.customerName?.charAt(0) || "?"}
                          </span>
                        </div>
                        <span className="text-sm text-gray-700 whitespace-nowrap">
                          {job.customerName}
                        </span>
                      </div>
                    </td>

                    {/* Provider */}
                    <td className="px-4 sm:px-6 py-3 sm:py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-medium text-emerald-700">
                            {job.providerName?.charAt(0) || "?"}
                          </span>
                        </div>
                        <span className="text-sm text-gray-700 whitespace-nowrap">
                          {job.providerName}
                        </span>
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="px-4 sm:px-6 py-3 sm:py-4">
                      <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                        BDT {job.amount}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 sm:px-6 py-3 sm:py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize whitespace-nowrap ${getStatusColor(job.status)}`}
                      >
                        {formatStatus(job.status)}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-4 sm:px-6 py-3 sm:py-4">
                      <div className="flex items-center gap-1.5">
                        <Icon
                          icon="mdi:calendar-outline"
                          className="w-3.5 h-3.5 text-gray-400 flex-shrink-0"
                        />
                        <span className="text-sm text-gray-500 whitespace-nowrap">
                          {formatDate(job.createdAt)}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}