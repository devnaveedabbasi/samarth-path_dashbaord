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
import Button from "../../../components/ui/Button";
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
interface ContentItem {
  _id: string;
  contentType: string;
  videoContent?: {
    title: string;
    videoUrl: string;
    thumbnail: string;
    description: string;
    isAutoMute: boolean;
    hasListenOnlyMode: boolean;
    durationSeconds?: number;
  };
  unlocksAt: string;
  date: string;
  isActive: boolean;
  likesCount: number;
  commentsCount: number;
  bookmarksCount: number;
  createdAt: string;
}

export default function VideoManagementPage() {
  const [contentList, setContentList] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1, totalPages: 1, totalItems: 0,
    itemsPerPage: 10, hasNextPage: false, hasPrevPage: false,
  });
  const [queryState, setQueryState] = useState({ page: 1, limit: 10, search: "", status: "" });
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 500);
  const [deleteTarget, setDeleteTarget] = useState<ContentItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [viewTarget, setViewTarget] = useState<ContentItem | null>(null);

  useEffect(() => {
    setQueryState((prev) => ({ ...prev, search: debouncedSearch, page: 1 }));
  }, [debouncedSearch]);

  // ─── Helper: Format Time & Date ───────────────────────────────────────────
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
  const fetchContent = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", queryState.page.toString());
      params.append("limit", queryState.limit.toString());
      if (queryState.search) params.append("search", queryState.search);
      if (queryState.status) params.append("status", queryState.status);

      const response = await axiosInstance.get(`/daily-content/video?${params.toString()}`, getConfig());
      
      if (response.data.success) {
        // API response structure update
        const { videos, pagination: meta } = response.data.data;
        setContentList(videos || []);
        setPagination({
          currentPage: meta?.currentPage || 1,
          totalPages: meta?.totalPages || 1,
          totalItems: meta?.totalVideos || 0,
          itemsPerPage: meta?.pageSize || 10,
          hasNextPage: meta?.hasNextPage || false,
          hasPrevPage: meta?.hasPrevPage || false,
        });
      }
    } catch (error: any) {
      toast.error("Failed to fetch video content");
      setContentList([]);
    } finally {
      setLoading(false);
    }
  }, [queryState]);

  useEffect(() => { fetchContent(); }, [fetchContent]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await axiosInstance.delete(`/daily-content/video/${deleteTarget._id}`, getConfig());
      if (res.data.success) { toast.success("Video deleted"); setDeleteTarget(null); fetchContent(); }
    } catch (e: any) { toast.error(e?.response?.data?.message ?? "Delete failed"); }
    finally { setDeleteLoading(false); }
  };

  // ─── Table Columns ────────────────────────────────────────────────────────
  const columns: Column<ContentItem>[] = [
    {
      key: "thumbnail",
      header: "Preview",
      cell: (item) => (
        <div className="relative w-16 h-10 rounded-lg overflow-hidden border border-gray-200 bg-black group">
          {item.videoContent?.thumbnail ? (
            <img src={item.videoContent.thumbnail} alt="thumb" className="w-full h-full object-cover opacity-80" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <Icon icon="mdi:video-off-outline" className="text-gray-400 w-5 h-5" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center">
            <Icon icon="mdi:play-circle" className="text-white w-6 h-6 drop-shadow-md" />
          </div>
        </div>
      ),
    },
    {
      key: "title",
      header: "Video Information",
      cell: (item) => (
        <div className="max-w-xs">
          <p className="text-sm font-bold text-gray-900 truncate">
            {item.videoContent?.title || "Untitled Video"}
          </p>
          <p className="text-xs text-gray-500 line-clamp-1">
            {item.videoContent?.description}
          </p>
        </div>
      ),
    },
    {
      key: "publishAt",
      header: "Publish Schedule",
      cell: (item) => {
        const { date, time } = formatPublishTime(item.date, item.unlocksAt);
        return (
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-700">{date}</span>
            <span className="text-xs text-indigo-600 font-medium flex items-center gap-1">
              <Icon icon="mdi:clock-outline" /> {time}
            </span>
          </div>
        );
      },
    },
    {
      key: "features",
      header: "Settings",
      cell: (item) => (
        <div className="flex gap-2">
           {item.videoContent?.hasListenOnlyMode && (
             <span title="Listen Only Available" className="p-1 bg-amber-50 text-amber-600 rounded">
               <Icon icon="mdi:headphones" className="w-4 h-4" />
             </span>
           )}
           {item.videoContent?.isAutoMute && (
             <span title="Auto Mute On" className="p-1 bg-gray-50 text-gray-600 rounded">
               <Icon icon="mdi:volume-off" className="w-4 h-4" />
             </span>
           )}
        </div>
      ),
    },
    {
      key: "isActive",
      header: "Status",
      cell: (item) => (
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
          item.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
        }`}>
          {item.isActive ? 'Live' : 'Hidden'}
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
          <Link href={`/dashboard/video/${item._id}/edit`} title="Edit"
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-200">
            <Icon icon="mdi:pencil-outline" className="w-4 h-4" />
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
    { label: "Total Videos", value: pagination.totalItems, icon: "mdi:video-library", color: "indigo" },
    { label: "Total Likes", value: contentList.reduce((a, b) => a + (b.likesCount || 0), 0), icon: "mdi:heart", color: "red" },
    { label: "Comments", value: contentList.reduce((a, b) => a + (b.commentsCount || 0), 0), icon: "mdi:comment-text", color: "blue" },
    { label: "Live Now", value: contentList.filter(i => i.isActive).length, icon: "mdi:broadcast", color: "emerald" },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Video Management</h1>
          <p className="text-sm text-gray-500 mt-1">Upload and manage daily motivational videos.</p>
        </div>
        <Link href="/dashboard/video/add">
          <Button icon="mdi:video-plus" className="bg-indigo-600 hover:bg-indigo-700">
            Add Video
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
              placeholder="Search by video title..."
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
          data={contentList}
          loading={loading}
          pagination={pagination}
          onPageChange={(page) => setQueryState((p) => ({ ...p, page }))}
          emptyTitle="No Videos Found"
          emptyDescription="You haven't uploaded any videos yet or your search matched nothing."
        />
      </div>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Video" maxWidth="max-w-sm">
        {deleteTarget && (
          <DeleteConfirmModal name={deleteTarget.videoContent?.title || "this video"}
            loading={deleteLoading} onConfirm={handleDelete} onClose={() => setDeleteTarget(null)} />
        )}
      </Modal>

      <Modal isOpen={!!viewTarget} onClose={() => setViewTarget(null)} title="Video Details" maxWidth="max-w-2xl">
        {viewTarget && (
          <div className="space-y-6">
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-black shadow-lg border border-gray-100">
              {viewTarget.videoContent?.videoUrl ? (
                <video src={viewTarget.videoContent.videoUrl} controls poster={viewTarget.videoContent.thumbnail} className="w-full h-full" />
              ) : (
                <div className="w-full h-full flex items-center justify-center flex-col gap-2">
                  <Icon icon="mdi:video-off-outline" className="w-12 h-12 text-gray-600" />
                  <p className="text-sm text-gray-400 font-medium">Video URL not available</p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold text-gray-900 leading-tight">{viewTarget.videoContent?.title}</h2>
                  <div className="flex items-center gap-4 text-xs text-gray-500 font-medium">
                    <span className="flex items-center gap-1.5"><Icon icon="mdi:calendar-outline" /> {formatPublishTime(viewTarget.date, viewTarget.unlocksAt).date}</span>
                    <span className="flex items-center gap-1.5"><Icon icon="mdi:clock-outline" /> {formatPublishTime(viewTarget.date, viewTarget.unlocksAt).time}</span>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${viewTarget.isActive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
                  {viewTarget.isActive ? "Live" : "Hidden"}
                </span>
              </div>

              <div className="flex gap-2">
                {viewTarget.videoContent?.hasListenOnlyMode && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-xl text-xs font-bold border border-amber-100">
                    <Icon icon="mdi:headphones" className="w-4 h-4" /> Listen Only Mode
                  </span>
                )}
                {viewTarget.videoContent?.isAutoMute && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-700 rounded-xl text-xs font-bold border border-gray-100">
                    <Icon icon="mdi:volume-off" className="w-4 h-4" /> Auto Mute On
                  </span>
                )}
              </div>

              <div className="p-5 bg-gray-50/50 rounded-2xl border border-gray-100">
                <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{viewTarget.videoContent?.description || "No description available."}</p>
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