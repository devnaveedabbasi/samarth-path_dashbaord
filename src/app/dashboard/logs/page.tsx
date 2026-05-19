"use client";

import React, { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { Icon } from "@iconify/react";
import axiosInstance from "@/config/axiosInstance";
import { getConfig } from "@/store/slicer";
import { DataTable, Column, PaginationInfo } from "@/components/ui/DataTable";
import Loader from "@/components/ui/Loader";

interface Log {
  _id: string;
  userId: { name: string; email: string; role: string };
  action: string;
  entityType: string;
  entityId: string;
  details: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 20, hasNextPage: false, hasPrevPage: false,
  });

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const response = await axiosInstance.get(`/logs?page=${page}&limit=20`, getConfig());
      if (response.data.success) {
        setLogs(response.data.data.logs);
        setPagination(response.data.data.pagination);
      }
    } catch (error) {
      toast.error("Failed to fetch activity logs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const columns: Column<Log>[] = [
    {
      key: "user",
      header: "User",
      cell: (l) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-[10px]">
            {l.userId?.name?.[0] || "S"}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{l.userId?.name || "System"}</p>
            <p className="text-[10px] text-gray-500 uppercase font-bold">{l.userId?.role || "N/A"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "action",
      header: "Action",
      cell: (l) => (
        <div>
          <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold uppercase tracking-wider">
            {l.action.replace(/_/g, ' ')}
          </span>
        </div>
      ),
    },
    {
      key: "entity",
      header: "Entity",
      cell: (l) => (
        <div className="text-xs">
          <p className="font-bold text-gray-700">{l.entityType}</p>
          <p className="text-[10px] text-gray-400 font-mono">{l.entityId}</p>
        </div>
      ),
    },
    {
      key: "details",
      header: "Details",
      cell: (l) => (
        <div className="max-w-xs truncate">
          <p className="text-xs text-gray-600 italic">
            {Object.entries(l.details || {}).map(([k, v]) => `${k}: ${v}`).join(', ')}
          </p>
        </div>
      ),
    },
    {
      key: "createdAt",
      header: "Timestamp",
      cell: (l) => (
        <div className="text-xs">
          <p className="font-semibold text-gray-900">{new Date(l.createdAt).toLocaleDateString()}</p>
          <p className="text-[10px] text-gray-400">{new Date(l.createdAt).toLocaleTimeString()}</p>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Activity Logs</h1>
          <p className="text-sm text-gray-500 mt-1">Audit trail of all significant actions in the platform.</p>
        </div>
        <button
          onClick={() => fetchLogs()}
          className="p-3 bg-white border border-gray-200 rounded-2xl hover:bg-gray-50 transition-all text-gray-600"
          title="Refresh Logs"
        >
          <Icon icon="mdi:refresh" className={`w-6 h-6 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={logs}
          loading={loading}
          pagination={pagination}
          onPageChange={fetchLogs}
          emptyTitle="No activity logs found"
        />
      </div>

      {loading && <Loader loading={loading} title="Fetching System Logs..." />}
    </div>
  );
}
