"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Icon } from "@iconify/react";
import axiosInstance from "@/config/axiosInstance";
import { getConfig } from "@/store/slicer";
import useDebounce from "@/hooks/useDebounce";
import { DataTable, Column, PaginationInfo } from "@/components/ui/DataTable";
import SummaryCards from "@/components/ui/SummaryCards";
import { CustomDropdown } from "@/components/ui/Dropdown";
import SearchInput from "@/components/ui/SearchInput";
import Button from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

function DeleteConfirmModal({ name, loading, onConfirm, onClose }: {
  name: string; loading: boolean; onConfirm: () => void; onClose: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
          <Icon icon="mdi:alert-circle-outline" className="w-7 h-7 text-red-500" />
        </div>
        <p className="text-sm text-gray-600">Permanently delete <span className="font-bold text-gray-900">"{name}"</span>? This cannot be undone.</p>
      </div>
      <div className="flex gap-3">
        <button onClick={onClose} disabled={loading} className="flex-1 h-11 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">Cancel</button>
        <button onClick={onConfirm} disabled={loading} className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
          {loading ? <Icon icon="mdi:loading" className="w-4 h-4 animate-spin" /> : <Icon icon="mdi:trash-can-outline" className="w-4 h-4" />}
          {loading ? "Deleting…" : "Delete"}
        </button>
      </div>
    </div>
  );
}

// ─── Interfaces ──────────────────────────────────────────────────────────────
interface QuizOption {
  id: string;
  text: string;
  _id: string;
}

interface QuizItem {
  _id: string;
  contentType: string;
  quizContent: {
    title: string;
    question: string;
    options: QuizOption[];
    correctOptionId: string;
    timerSeconds: number;
    explanation: string;
  };
  unlocksAt: string;
  date: string;
  isActive: boolean;
  likesCount: number;
  commentsCount: number;
  bookmarksCount: number;
  createdAt: string;
}

export default function QuizManagementPage() {
  const [quizList, setQuizList] = useState<QuizItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
    hasNextPage: false,
    hasPrevPage: false,
  });

  const [queryState, setQueryState] = useState({
    page: 1,
    limit: 10,
    search: "",
    status: "",
  });

  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 500);
  const [deleteTarget, setDeleteTarget] = useState<QuizItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [viewTarget, setViewTarget] = useState<QuizItem | null>(null);

  useEffect(() => {
    setQueryState((prev) => ({ ...prev, search: debouncedSearch, page: 1 }));
  }, [debouncedSearch]);

  // ─── Helper: Format Time ──────────────────────────────────────────────────
  const formatPublishTime = (dateStr: string, timeStr: string) => {
    try {
      const dateObj = new Date(dateStr);
      const formattedDate = dateObj.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

      const [hours, minutes] = timeStr.replace(".", ":").split(":");
      let hh = parseInt(hours);
      const ampm = hh >= 12 ? "PM" : "AM";
      hh = hh % 12 || 12;
      const formattedTime = `${hh.toString().padStart(2, "0")}:${minutes} ${ampm}`;

      return { date: formattedDate, time: formattedTime };
    } catch (error) {
      return { date: dateStr, time: timeStr };
    }
  };

  // ─── Data Fetching ────────────────────────────────────────────────────────
  const fetchQuizzes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", queryState.page.toString());
      params.append("limit", queryState.limit.toString());
      if (queryState.search) params.append("search", queryState.search);
      if (queryState.status) params.append("status", queryState.status);

      const response = await axiosInstance.get(`/daily-content/quiz?${params.toString()}`, getConfig());

      if (response.data.success) {
        // Mapping based on your specific JSON response structure
        const { quizzes, totalPages, currentPage, totalQuizzes } = response.data.data;

        setQuizList(quizzes || []);
        setPagination({
          currentPage: parseInt(currentPage) || 1,
          totalPages: totalPages || 1,
          totalItems: totalQuizzes || 0,
          itemsPerPage: queryState.limit,
          hasNextPage: parseInt(currentPage) < totalPages,
          hasPrevPage: parseInt(currentPage) > 1,
        });
      }
    } catch (error: any) {
      toast.error("Failed to fetch quizzes");
      setQuizList([]);
    } finally {
      setLoading(false);
    }
  }, [queryState]);

  useEffect(() => { fetchQuizzes(); }, [fetchQuizzes]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await axiosInstance.delete(`/daily-content/quiz/${deleteTarget._id}`, getConfig());
      if (res.data.success) { toast.success("Quiz deleted"); setDeleteTarget(null); fetchQuizzes(); }
    } catch (e: any) { toast.error(e?.response?.data?.message ?? "Delete failed"); }
    finally { setDeleteLoading(false); }
  };

  // ─── Table Columns ────────────────────────────────────────────────────────
  const columns: Column<QuizItem>[] = [
    {
      key: "quizInfo",
      header: "Quiz Details",
      cell: (item) => (
        <div className="max-w-xs">
          <p className="text-sm font-bold text-gray-900 truncate">
            {item.quizContent?.title || "No Title"}
          </p>
          <p className="text-xs text-gray-500 line-clamp-1">
            {item.quizContent?.question}
          </p>
        </div>
      ),
    },
    // {
    //   key: "timer",
    //   header: "Timer",
    //   cell: (item) => (
    //     <div className="flex items-center gap-1.5 text-gray-600">
    //       <Icon icon="mdi:timer-outline" className="w-4 h-4 text-orange-500" />
    //       <span className="text-sm font-medium">{item.quizContent?.timerSeconds}s</span>
    //     </div>
    //   ),
    // },
    {
      key: "publishAt",
      header: "Publish Schedule",
      cell: (item) => {
        const { date, time } = formatPublishTime(item.date, item.unlocksAt);
        return (
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-700">{date}</span>
            <span className="text-xs text-primary-600 font-medium flex items-center gap-1">
              <Icon icon="mdi:clock-outline" /> {time}
            </span>
          </div>
        );
      },
    },
    {
      key: "options",
      header: "Options",
      cell: (item) => (
        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px] font-bold">
          {item.quizContent?.options?.length || 0} CHOICES
        </span>
      ),
    },
    {
      key: "isActive",
      header: "Status",
      cell: (item) => (
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${item.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
          }`}>
          {item.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (item) => (
        <div className="flex items-center gap-1.5">
          <button onClick={() => setViewTarget(item)} title="View Detail"
            className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-transparent hover:border-emerald-200">
            <Icon icon="mdi:eye-outline" className="w-4 h-4" />
          </button>
          <Link href={`/dashboard/quiz/${item._id}/edit`} title="Edit Quiz"
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-200">
            <Icon icon="mdi:pencil-outline" className="w-4 h-4" />
          </Link>
          <Link href={`/dashboard/quiz/results/${item._id}`} title="View Results"
            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-200">
            <Icon icon="mdi:chart-box-outline" className="w-4 h-4" />
          </Link>
          <button onClick={() => setDeleteTarget(item)} title="Delete"
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200">
            <Icon icon="mdi:trash-can-outline" className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const summaryCards = [
    { label: "Total Quizzes", value: pagination.totalItems, icon: "mdi:help-circle", color: "blue" },
    { label: "Total Likes", value: quizList.reduce((a, b) => a + (b.likesCount || 0), 0), icon: "mdi:heart", color: "red" },
    { label: "Active Quizzes", value: quizList.filter(i => i.isActive).length, icon: "mdi:check-circle", color: "emerald" },
    { label: "Bookmarked", value: quizList.reduce((a, b) => a + (b.bookmarksCount || 0), 0), icon: "mdi:bookmark", color: "amber" },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quiz Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage daily interactive quizzes and questions.</p>
        </div>
        <Link href="/dashboard/quiz/add">
          <Button icon="mdi:plus" className="bg-primary-600 hover:bg-primary-700">
            Add Quiz
          </Button>
        </Link>
      </div>

      <SummaryCards data={summaryCards as any} />

      <div className="bg-white/80 backdrop-blur-xl border z-50 border-gray-100 shadow-sm rounded-2xl ">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 p-3">
          <div className="lg:col-span-9 w-full">
            <SearchInput
              value={searchInput}
              onChange={setSearchInput}
              placeholder="Search by quiz title or question..."
            />
          </div>
          <div className="lg:col-span-3 w-full">
            <CustomDropdown
              icon="mdi:filter-variant"
              placeholder="Status"
              options={[
                { value: "", label: "All Status" },
                { value: "true", label: "Active" },
                { value: "false", label: "Inactive" },
              ]}
              value={queryState.status}
              onChange={(val: any) => setQueryState((p) => ({ ...p, status: val as string, page: 1 }))}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={quizList}
          loading={loading}
          pagination={pagination}
          onPageChange={(page) => setQueryState((p) => ({ ...p, page }))}
          emptyTitle="No Quizzes Found"
          emptyDescription="Start by creating your first daily quiz."
        />
      </div>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Quiz" maxWidth="max-w-sm">
        {deleteTarget && (
          <DeleteConfirmModal name={deleteTarget.quizContent?.title || "this quiz"}
            loading={deleteLoading} onConfirm={handleDelete} onClose={() => setDeleteTarget(null)} />
        )}
      </Modal>

      <Modal isOpen={!!viewTarget} onClose={() => setViewTarget(null)} title="Quiz Details" maxWidth="max-w-2xl">
        {viewTarget && (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold text-gray-900 leading-tight">{viewTarget.quizContent?.title}</h2>
                  <div className="flex items-center gap-4 text-xs text-gray-500 font-medium">
                    <span className="flex items-center gap-1.5"><Icon icon="mdi:calendar-outline" /> {formatPublishTime(viewTarget.date, viewTarget.unlocksAt).date}</span>
                    <span className="flex items-center gap-1.5"><Icon icon="mdi:clock-outline" /> {formatPublishTime(viewTarget.date, viewTarget.unlocksAt).time}</span>
                    <span className="flex items-center gap-1.5 text-orange-600"><Icon icon="mdi:timer-outline" /> {viewTarget.quizContent?.timerSeconds}s Timer</span>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${viewTarget.isActive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
                  {viewTarget.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="p-5 bg-primary-50/30 rounded-2xl border border-primary-100/50">
                <p className="text-xs font-bold text-primary-600 uppercase tracking-widest mb-2">Question</p>
                <p className="text-gray-800 text-lg font-semibold leading-relaxed">{viewTarget.quizContent?.question}</p>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Options</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {viewTarget.quizContent?.options?.map((opt) => {
                    const isCorrect = opt.id === viewTarget.quizContent.correctOptionId;
                    return (
                      <div key={opt._id} className={`p-4 rounded-xl border transition-all ${
                        isCorrect 
                          ? "bg-emerald-50 border-emerald-200 ring-1 ring-emerald-200" 
                          : "bg-white border-gray-100"
                      }`}>
                        <div className="flex items-center justify-between gap-3">
                          <span className={`text-sm font-medium ${isCorrect ? "text-emerald-900" : "text-gray-700"}`}>{opt.text}</span>
                          {isCorrect && <Icon icon="mdi:check-circle" className="text-emerald-500 w-5 h-5 shrink-0" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <Icon icon="mdi:information-outline" className="text-gray-400 w-4 h-4" />
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Explanation</p>
                </div>
                <p className="text-gray-700 text-sm leading-relaxed">{viewTarget.quizContent?.explanation || "No explanation provided."}</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-white border border-gray-100 rounded-xl text-center shadow-sm">
                  <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Likes</p>
                  <p className="text-lg font-bold text-gray-900">{viewTarget.likesCount || 0}</p>
                </div>
                <div className="p-3 bg-white border border-gray-100 rounded-xl text-center shadow-sm">
                  <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Comments</p>
                  <p className="text-lg font-bold text-gray-900">{viewTarget.commentsCount || 0}</p>
                </div>
                <div className="p-3 bg-white border border-gray-100 rounded-xl text-center shadow-sm">
                  <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Bookmarks</p>
                  <p className="text-lg font-bold text-gray-900">{viewTarget.bookmarksCount || 0}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}