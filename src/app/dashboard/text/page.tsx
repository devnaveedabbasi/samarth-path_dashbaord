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

interface ContentItem {
  _id: string;
  contentType: string;
  textContent?: { title: string; description: string; label: string; image: string };
  unlocksAt: string;
  date: string;
  isActive: boolean;
  likesCount: number;
  commentsCount: number;
  bookmarksCount: number;
  createdAt: string;
}

function DeleteConfirmModal({ name, loading, onConfirm, onClose }: {
  name: string; loading: boolean; onConfirm: () => void; onClose: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
          <Icon icon="mdi:alert-circle-outline" className="w-7 h-7 text-red-500" />
        </div>
        <p className="text-sm text-gray-600">
          Permanently delete <span className="font-bold text-gray-900">"{name}"</span>?
          Users will no longer see this content.
        </p>
      </div>
      <div className="flex gap-3">
        <button onClick={onClose} disabled={loading}
          className="flex-1 h-11 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50">
          Cancel
        </button>
        <button onClick={onConfirm} disabled={loading}
          className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
          {loading ? <Icon icon="mdi:loading" className="w-4 h-4 animate-spin" /> : <Icon icon="mdi:trash-can-outline" className="w-4 h-4" />}
          {loading ? "Deleting…" : "Delete"}
        </button>
      </div>
    </div>
  );
}

export default function TextManagementPage() {
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

  useEffect(() => { setQueryState((p) => ({ ...p, search: debouncedSearch, page: 1 })); }, [debouncedSearch]);

  const fmt = (dateStr: string, timeStr: string) => {
    try {
      const d = new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
      const [h, m] = timeStr.replace(".", ":").split(":");
      let hh = parseInt(h); const ap = hh >= 12 ? "PM" : "AM"; hh = hh % 12 || 12;
      return { date: d, time: `${String(hh).padStart(2, "0")}:${m} ${ap}` };
    } catch { return { date: dateStr, time: timeStr }; }
  };

  const fetchContent = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      p.append("page", queryState.page.toString()); p.append("limit", queryState.limit.toString());
      if (queryState.search) p.append("search", queryState.search);
      if (queryState.status) p.append("status", queryState.status);
      const res = await axiosInstance.get(`/daily-content/text?${p.toString()}`, getConfig());
      if (res.data.success) {
        const { content, pagination: meta } = res.data.data;
        setContentList(content || []);
        setPagination({ currentPage: meta?.currentPage || 1, totalPages: meta?.totalPages || 1, totalItems: meta?.totalItems || 0, itemsPerPage: queryState.limit, hasNextPage: meta?.currentPage < meta?.totalPages, hasPrevPage: meta?.currentPage > 1 });
      }
    } catch { toast.error("Failed to fetch content"); setContentList([]); }
    finally { setLoading(false); }
  }, [queryState]);

  useEffect(() => { fetchContent(); }, [fetchContent]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await axiosInstance.delete(`/daily-content/text/${deleteTarget._id}`, getConfig());
      if (res.data.success) { toast.success("Content deleted"); setDeleteTarget(null); fetchContent(); }
    } catch (e: any) { toast.error(e?.response?.data?.message ?? "Delete failed"); }
    finally { setDeleteLoading(false); }
  };

  const columns: Column<ContentItem>[] = [
    { key: "image", header: "Image", cell: (item) => (
      <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-100 bg-gray-50">
        {item.textContent?.image ? <img src={item.textContent.image} alt="thumb" className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center"><Icon icon="mdi:image-off-outline" className="text-gray-300 w-5 h-5" /></div>}
      </div>
    )},
    { key: "title", header: "Content Information", cell: (item) => (
      <div className="max-w-xs">
        <p className="text-sm font-bold text-gray-900 truncate">{item.textContent?.title || "Untitled"}</p>
        <p className="text-xs text-gray-500 line-clamp-1">{item.textContent?.description}</p>
      </div>
    )},
    { key: "publishAt", header: "Publish At", cell: (item) => {
      const { date, time } = fmt(item.date, item.unlocksAt);
      return <div className="flex flex-col"><span className="text-sm font-semibold text-gray-700">{date}</span><span className="text-xs text-primary-600 font-medium flex items-center gap-1"><Icon icon="mdi:clock-outline" /> {time}</span></div>;
    }},
    { key: "label", header: "Label", cell: (item) => (
      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px] font-bold uppercase">{item.textContent?.label || "None"}</span>
    )},
    { key: "isActive", header: "Status", cell: (item) => (
      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${item.isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
        {item.isActive ? "Active" : "Inactive"}
      </span>
    )},
    { key: "actions", header: "Actions", cell: (item) => (
      <div className="flex items-center gap-1.5">
        <button onClick={() => setViewTarget(item)} title="View"
          className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-transparent hover:border-emerald-200">
          <Icon icon="mdi:eye-outline" className="w-4 h-4" />
        </button>
        <Link href={`/dashboard/text/${item._id}/edit`} title="Edit"
          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-200">
          <Icon icon="mdi:pencil-outline" className="w-4 h-4" />
        </Link>
        <button onClick={() => setDeleteTarget(item)} title="Delete"
          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200">
          <Icon icon="mdi:trash-can-outline" className="w-4 h-4" />
        </button>
      </div>
    )},
  ];

  const summaryCards = [
    { label: "Total Updates", value: String(pagination.totalItems), icon: "mdi:format-text", color: "" },
    { label: "Total Likes", value: String(contentList.reduce((a, b) => a + (b.likesCount || 0), 0)), icon: "mdi:heart", color: "" },
    { label: "Total Bookmarks", value: String(contentList.reduce((a, b) => a + (b.bookmarksCount || 0), 0)), icon: "mdi:bookmark", color: "" },
    { label: "Active Content", value: String(contentList.filter(i => i.isActive).length), icon: "mdi:check-circle", color: "" },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Text Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage daily text-based updates.</p>
        </div>
        <Link href="/dashboard/text/add"><Button icon="mdi:plus">Add Text</Button></Link>
      </div>

      <SummaryCards data={summaryCards as any} />

      <div className="bg-white/80 backdrop-blur-xl border border-gray-100 shadow-sm rounded-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 p-3">
          <div className="lg:col-span-9 w-full">
            <SearchInput value={searchInput} onChange={setSearchInput} placeholder="Search by title or label..." />
          </div>
          <div className="lg:col-span-3 w-full">
            <CustomDropdown icon="mdi:filter-variant" placeholder="Status"
              options={[{ value: "", label: "All Status" }, { value: "true", label: "Active" }, { value: "false", label: "Inactive" }]}
              value={queryState.status} onChange={(v: any) => setQueryState((p) => ({ ...p, status: v, page: 1 }))} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <DataTable columns={columns} data={contentList} loading={loading} pagination={pagination}
          onPageChange={(page) => setQueryState((p) => ({ ...p, page }))}
          emptyTitle="No Content Found" emptyDescription="Try adjusting your search or filters." />
      </div>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Text Content" maxWidth="max-w-sm">
        {deleteTarget && (
          <DeleteConfirmModal name={deleteTarget.textContent?.title || "this content"}
            loading={deleteLoading} onConfirm={handleDelete} onClose={() => setDeleteTarget(null)} />
        )}
      </Modal>

      <Modal isOpen={!!viewTarget} onClose={() => setViewTarget(null)} title="View Text Content" maxWidth="max-w-2xl">
        {viewTarget && (
          <div className="space-y-6">
            {viewTarget.textContent?.image && (
              <div className="w-full h-64 rounded-xl overflow-hidden border border-gray-100 shadow-sm">
                <img src={viewTarget.textContent.image} alt="content" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-2xl font-bold text-gray-900 leading-tight">{viewTarget.textContent?.title}</h2>
                <span className="shrink-0 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold uppercase">{viewTarget.textContent?.label || "No Label"}</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500 font-medium">
                <span className="flex items-center gap-1.5"><Icon icon="mdi:calendar-outline" className="text-gray-400" /> {fmt(viewTarget.date, viewTarget.unlocksAt).date}</span>
                <span className="flex items-center gap-1.5"><Icon icon="mdi:clock-outline" className="text-gray-400" /> {fmt(viewTarget.date, viewTarget.unlocksAt).time}</span>
              </div>
              <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 min-h-[120px]">
                <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{viewTarget.textContent?.description || "No description available."}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-white border border-gray-100 rounded-xl text-center">
                <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Likes</p>
                <p className="text-lg font-bold text-gray-900">{viewTarget.likesCount || 0}</p>
              </div>
              <div className="p-3 bg-white border border-gray-100 rounded-xl text-center">
                <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Comments</p>
                <p className="text-lg font-bold text-gray-900">{viewTarget.commentsCount || 0}</p>
              </div>
              <div className="p-3 bg-white border border-gray-100 rounded-xl text-center">
                <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Bookmarks</p>
                <p className="text-lg font-bold text-gray-900">{viewTarget.bookmarksCount || 0}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}