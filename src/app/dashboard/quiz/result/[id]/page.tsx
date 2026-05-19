"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Icon } from "@iconify/react";
import axiosInstance from "@/config/axiosInstance";
import { getConfig } from "@/store/slicer";
import { DataTable, Column, PaginationInfo } from "@/components/ui/DataTable";
import SummaryCards from "@/components/ui/SummaryCards";
import Button from "@/components/ui/Button";

interface AttemptItem {
  _id: string;
  userId: { name: string; email: string };
  isCorrect: boolean;
  timeTakenSeconds: number;
  createdAt: string;
}

export default function QuizResultsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [attempts, setAttempts] = useState<AttemptItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
    hasNextPage: false,
    hasPrevPage: false,
  });

  const fetchAttempts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get(`/daily-content/quiz/${id}/attempts?page=1&limit=10`, getConfig());
      if (response.data.success) {
        const { attempts, totalAttempts, currentPage } = response.data.data;
        setAttempts(attempts || []);
        setPagination({
          currentPage: parseInt(currentPage) || 1,
          totalPages: Math.ceil(totalAttempts / 10),
          totalItems: totalAttempts,
          itemsPerPage: 10,
          hasNextPage: attempts.length === 10,
          hasPrevPage: parseInt(currentPage) > 1,
        });
      }
    } catch (error) {
      toast.error("Failed to fetch results");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAttempts();
  }, [fetchAttempts]);

  const columns: Column<AttemptItem>[] = [
    {
      key: "user",
      header: "User",
      cell: (item) => (
        <div>
          <p className="text-sm font-bold text-gray-900">{item.userId?.name}</p>
          <p className="text-xs text-gray-500">{item.userId?.email}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Performance",
      cell: (item) => (
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${item.isCorrect ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          {item.isCorrect ? "Correct" : "Incorrect"}
        </span>
      ),
    },
    {
      key: "time",
      header: "Time Taken",
      cell: (item) => (
        <span className="text-sm text-gray-600 font-medium">
          {Math.floor(item.timeTakenSeconds / 60)}m {item.timeTakenSeconds % 60}s
        </span>
      ),
    },
    {
      key: "date",
      header: "Attempted At",
      cell: (item) => <span className="text-sm text-gray-500">{new Date(item.createdAt).toLocaleDateString()}</span>,
    },
  ];

  const summaryCards = [
    { label: "Total Attempts", value: pagination.totalItems, icon: "mdi:account-group", color: "blue" },
    { label: "Correct Answers", value: attempts.filter(a => a.isCorrect).length, icon: "mdi:check-circle", color: "emerald" },
    { label: "Incorrect Answers", value: attempts.filter(a => !a.isCorrect).length, icon: "mdi:close-circle", color: "red" },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 lg:p-8 space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 bg-white border border-gray-200 rounded-xl">
          <Icon icon="mdi:arrow-left" className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quiz Results</h1>
          <p className="text-sm text-gray-500">Track users participation and performance.</p>
        </div>
      </div>

      <SummaryCards data={summaryCards as any} />

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={attempts}
          loading={loading}
          pagination={pagination}
          onPageChange={(page) => console.log("Fetch page", page)}
          emptyTitle="No Attempts Yet"
          emptyDescription="Users haven't attempted this quiz yet."
        />
      </div>
    </div>
  );
}