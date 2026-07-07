"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Icon } from "@iconify/react";
import toast from "react-hot-toast";
import axiosInstance from "@/config/axiosInstance";
import { getConfig } from "@/store/slicer";
import useDebounce from "@/hooks/useDebounce";
import { DataTable, Column, PaginationInfo } from "@/components/ui/DataTable";
import SearchInput from "@/components/ui/SearchInput";
import Button from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

interface Prize {
  _id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  prizeType: "daily" | "weekly";
  weekNumber?: number;
  year?: number;
  quizId?: { _id: string; date: string; quizContent?: { title: string } } | null;
  createdAt: string;
}

interface PrizeForm {
  title: string;
  description: string;
  imageFile: File | null;
  imagePreview: string;
}

const emptyForm: PrizeForm = {
  title: "",
  description: "",
  imageFile: null,
  imagePreview: "",
};

interface CurrentWeekInfo {
  weekNumber: number;
  year: number;
  startOfWeek: string;
  endOfWeek: string;
  prizeAlreadyExists: boolean;
}

function ImagePicker({
  preview,
  existingUrl,
  onChange,
}: {
  preview: string;
  existingUrl?: string;
  onChange: (file: File) => void;
}) {
  const inputId = React.useId();
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        Prize Image <span className="text-gray-400 font-normal text-xs">(Optional)</span>
      </label>
      <label
        htmlFor={inputId}
        className="relative cursor-pointer rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 hover:border-primary-400 hover:bg-primary-50/40 transition-all overflow-hidden flex items-center justify-center"
      >
        {preview || existingUrl ? (
          <div className="relative w-full h-36 group">
            <img src={preview || existingUrl} alt="Prize preview" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Icon icon="mdi:camera-retake-outline" className="w-7 h-7 text-white mb-1" />
              <p className="text-white text-sm font-medium">Change Image</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <Icon icon="mdi:cloud-upload-outline" className="w-8 h-8 text-primary-500 mb-2" />
            <p className="text-sm font-semibold text-gray-700">Click to upload an image</p>
            <p className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP — max 5MB</p>
          </div>
        )}
        <input
          id={inputId}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onChange(file);
            e.target.value = "";
          }}
        />
      </label>
    </div>
  );
}

export default function PrizesManagementPage() {
  const [activeTab, setActiveTab] = useState<"daily" | "weekly">("daily");
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
    hasNextPage: false,
    hasPrevPage: false,
  });

  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 500);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<PrizeForm>(emptyForm);
  const [createSaving, setCreateSaving] = useState(false);
  const [currentWeek, setCurrentWeek] = useState<CurrentWeekInfo | null>(null);
  const [currentWeekLoading, setCurrentWeekLoading] = useState(false);

  const [editTarget, setEditTarget] = useState<Prize | null>(null);
  const [editForm, setEditForm] = useState<PrizeForm>(emptyForm);
  const [editSaving, setEditSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Prize | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [activeTab, debouncedSearch]);

  const fetchPrizes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", "10");
      if (debouncedSearch) params.append("search", debouncedSearch);

      const response = await axiosInstance.get(`/prizes/${activeTab}?${params.toString()}`, getConfig());
      if (response.data.success) {
        const { prizes: list, totalPages, currentPage, totalPrizes } = response.data.data;
        setPrizes(list || []);
        setPagination({
          currentPage: parseInt(currentPage) || 1,
          totalPages: totalPages || 1,
          totalItems: totalPrizes || 0,
          itemsPerPage: 10,
          hasNextPage: parseInt(currentPage) < totalPages,
          hasPrevPage: parseInt(currentPage) > 1,
        });
      }
    } catch (error: any) {
      toast.error("Failed to fetch prizes");
      setPrizes([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, debouncedSearch]);

  useEffect(() => {
    fetchPrizes();
  }, [fetchPrizes]);

  const fetchCurrentWeek = async () => {
    setCurrentWeekLoading(true);
    try {
      const response = await axiosInstance.get("/prizes/current-week", getConfig());
      if (response.data.success) {
        setCurrentWeek(response.data.data);
      }
    } catch (error: any) {
      toast.error("Failed to determine the current week");
    } finally {
      setCurrentWeekLoading(false);
    }
  };

  const openCreateModal = () => {
    setCreateForm(emptyForm);
    setShowCreateModal(true);
    fetchCurrentWeek();
  };

  const handleCreateWeeklyPrize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title.trim()) {
      toast.error("Prize title is required");
      return;
    }
    setCreateSaving(true);
    try {
      const formData = new FormData();
      formData.append("title", createForm.title.trim());
      formData.append("description", createForm.description.trim());
      if (createForm.imageFile) formData.append("image", createForm.imageFile);

      const response = await axiosInstance.post("/prizes/weekly", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data.success) {
        toast.success("Weekly prize created successfully!");
        setShowCreateModal(false);
        setCreateForm(emptyForm);
        fetchPrizes();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create weekly prize");
    } finally {
      setCreateSaving(false);
    }
  };

  const openEdit = (prize: Prize) => {
    setEditTarget(prize);
    setEditForm({
      title: prize.title,
      description: prize.description || "",
      imageFile: null,
      imagePreview: "",
    });
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    if (!editForm.title.trim()) {
      toast.error("Prize title is required");
      return;
    }
    setEditSaving(true);
    try {
      const formData = new FormData();
      formData.append("title", editForm.title.trim());
      formData.append("description", editForm.description.trim());
      if (editForm.imageFile) formData.append("image", editForm.imageFile);

      const response = await axiosInstance.put(`/prizes/${editTarget._id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data.success) {
        toast.success("Prize updated successfully!");
        setEditTarget(null);
        fetchPrizes();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update prize");
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const response = await axiosInstance.delete(`/prizes/${deleteTarget._id}`, getConfig());
      if (response.data.success) {
        toast.success("Prize deleted");
        setDeleteTarget(null);
        fetchPrizes();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete prize");
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns: Column<Prize>[] = [
    {
      key: "prize",
      header: "Prize",
      cell: (item) => (
        <div className="flex items-center gap-3">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.title} className="w-10 h-10 rounded-lg object-cover border border-gray-100" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
              <Icon icon="mdi:gift-outline" className="w-5 h-5 text-primary-500" />
            </div>
          )}
          <div className="max-w-xs">
            <p className="text-sm font-semibold text-gray-900 truncate">{item.title}</p>
            {item.description && (
              <p className="text-xs text-gray-500 truncate">{item.description}</p>
            )}
          </div>
        </div>
      ),
    },
    activeTab === "daily"
      ? {
          key: "quiz",
          header: "Linked Quiz",
          cell: (item) =>
            item.quizId ? (
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-700 truncate max-w-[220px]">
                  {item.quizId.quizContent?.title || "Quiz"}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(item.quizId.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
              </div>
            ) : (
              <span className="text-xs text-gray-400">Quiz deleted</span>
            ),
        }
      : {
          key: "week",
          header: "Week",
          cell: (item) => (
            <span className="text-sm font-medium text-gray-700">
              Week {item.weekNumber}, {item.year}
            </span>
          ),
        },
    {
      key: "createdAt",
      header: "Created",
      cell: (item) => (
        <span className="text-sm text-gray-500">
          {new Date(item.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (item) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => openEdit(item)}
            title="Edit Prize"
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-200"
          >
            <Icon icon="mdi:pencil-outline" className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeleteTarget(item)}
            title="Delete Prize"
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200"
          >
            <Icon icon="mdi:trash-can-outline" className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Prizes Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Daily prizes are added when a quiz is created. Weekly prizes are created here.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Tabs */}
          <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab("daily")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "daily" ? "bg-white text-primary-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon icon="mdi:calendar-today" className="w-4 h-4" />
                Daily
              </div>
            </button>
            <button
              onClick={() => setActiveTab("weekly")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "weekly" ? "bg-white text-primary-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon icon="mdi:calendar-week" className="w-4 h-4" />
                Weekly
              </div>
            </button>
          </div>

          {activeTab === "weekly" && (
            <Button icon="mdi:plus" onClick={openCreateModal}>
              Create Weekly Prize
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-xl border border-gray-100 shadow-sm rounded-2xl p-3">
        <SearchInput value={searchInput} onChange={setSearchInput} placeholder="Search by prize title..." />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={prizes}
          loading={loading}
          pagination={pagination}
          onPageChange={setPage}
          emptyIcon="mdi:gift-off-outline"
          emptyTitle={activeTab === "daily" ? "No Daily Prizes Yet" : "No Weekly Prizes Yet"}
          emptyDescription={
            activeTab === "daily"
              ? "Daily prizes are added right after a quiz is created in Quiz Management."
              : "Create a weekly prize using the button above."
          }
        />
      </div>

      {/* Create Weekly Prize Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Weekly Prize">
        <form onSubmit={handleCreateWeeklyPrize} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Prize Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={createForm.title}
              onChange={(e) => setCreateForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="e.g. Amazon Gift Card - Rs. 5000"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-gray-50/50 focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Week</label>
            {currentWeekLoading ? (
              <div className="h-14 bg-gray-100 rounded-xl animate-pulse" />
            ) : currentWeek ? (
              <div
                className={`p-3.5 rounded-xl border flex items-center gap-3 ${
                  currentWeek.prizeAlreadyExists
                    ? "bg-amber-50 border-amber-200"
                    : "bg-primary-50 border-primary-100"
                }`}
              >
                <Icon
                  icon="mdi:calendar-week"
                  className={`w-5 h-5 shrink-0 ${currentWeek.prizeAlreadyExists ? "text-amber-600" : "text-primary-600"}`}
                />
                <div>
                  <p className={`text-sm font-semibold ${currentWeek.prizeAlreadyExists ? "text-amber-800" : "text-primary-800"}`}>
                    Week {currentWeek.weekNumber}, {currentWeek.year} (Mon–Sun)
                  </p>
                  <p className={`text-xs ${currentWeek.prizeAlreadyExists ? "text-amber-700" : "text-primary-700"}`}>
                    {new Date(currentWeek.startOfWeek).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} –{" "}
                    {new Date(currentWeek.endOfWeek).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    {currentWeek.prizeAlreadyExists && " — a prize already exists for this week, edit it instead"}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400">Unable to determine the current week.</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Description <span className="text-gray-400 font-normal text-xs">(Optional)</span>
            </label>
            <textarea
              value={createForm.description}
              onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
              rows={3}
              placeholder="Optional description..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-gray-50/50 focus:bg-white transition-all resize-none"
            />
          </div>

          <ImagePicker
            preview={createForm.imagePreview}
            onChange={(file) =>
              setCreateForm((p) => ({ ...p, imageFile: file, imagePreview: URL.createObjectURL(file) }))
            }
          />

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="w-full!" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="w-full!"
              loading={createSaving}
              disabled={currentWeekLoading || !!currentWeek?.prizeAlreadyExists}
            >
              <Icon icon="mdi:gift" className="w-4 h-4" />
              Create Prize
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Prize Modal */}
      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Prize">
        <form onSubmit={handleEditSave} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Prize Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={editForm.title}
              onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-gray-50/50 focus:bg-white transition-all"
            />
          </div>

          {editTarget?.prizeType === "weekly" && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Week</label>
              <div className="px-4 py-3 rounded-xl bg-gray-100 text-gray-500 flex items-center gap-2">
                <Icon icon="mdi:calendar-week" className="w-4 h-4" />
                <span className="text-sm font-medium">
                  Week {editTarget.weekNumber}, {editTarget.year}
                </span>
                <span className="text-xs text-gray-400 ml-auto">Locked — set when created</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Description <span className="text-gray-400 font-normal text-xs">(Optional)</span>
            </label>
            <textarea
              value={editForm.description}
              onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-gray-50/50 focus:bg-white transition-all resize-none"
            />
          </div>

          <ImagePicker
            preview={editForm.imagePreview}
            existingUrl={editTarget?.imageUrl}
            onChange={(file) =>
              setEditForm((p) => ({ ...p, imageFile: file, imagePreview: URL.createObjectURL(file) }))
            }
          />
          {editTarget?.imageUrl && !editForm.imagePreview && (
            <p className="flex items-center gap-1 text-xs text-gray-500">
              <Icon icon="mdi:information-outline" className="w-3.5 h-3.5 text-blue-400" />
              Leave empty to keep the current image. Upload a new file to replace it.
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="w-full!" onClick={() => setEditTarget(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="w-full!" loading={editSaving}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Prize" maxWidth="max-w-sm">
        {deleteTarget && (
          <div className="space-y-5">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
                <Icon icon="mdi:alert-circle-outline" className="w-7 h-7 text-red-500" />
              </div>
              <p className="text-sm text-gray-600">
                Permanently delete <span className="font-bold text-gray-900">"{deleteTarget.title}"</span>? This cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleteLoading}
                className="flex-1 h-11 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleteLoading ? <Icon icon="mdi:loading" className="w-4 h-4 animate-spin" /> : <Icon icon="mdi:trash-can-outline" className="w-4 h-4" />}
                {deleteLoading ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
