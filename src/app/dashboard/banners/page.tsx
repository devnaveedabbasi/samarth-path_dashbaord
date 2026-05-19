"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import axiosInstance from "@/config/axiosInstance";
import { getConfig } from "@/store/slicer";
import { Icon } from "@iconify/react";

const MAX_BANNERS = 5;
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface Banner {
  _id: string;
  title: string;
  description: string;
  image: string;
  isActive: boolean;
  createdAt: string;
}

interface Summary {
  total: number;
  active: number;
  inactive: number;
  remainingSlots: number;
}

interface FormState {
  title: string;
  description: string;
  imageFile: File | null;
  imagePreview: string;
}

const emptyForm: FormState = {
  title: "",
  description: "",
  imageFile: null,
  imagePreview: "",
};

function TableSkeleton() {
  return (
    <div className="divide-y divide-gray-100">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
          <div className="h-16 w-28 bg-gray-200/60 rounded-xl" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-40 bg-gray-200/60 rounded" />
            <div className="h-3 w-56 bg-gray-100/60 rounded" />
          </div>
          <div className="h-6 w-20 bg-gray-200/60 rounded-full" />
          <div className="flex gap-2">
            <div className="h-8 w-8 bg-gray-200/60 rounded-lg" />
            <div className="h-8 w-8 bg-gray-200/60 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ImageUploader({
  preview,
  onChange,
  error,
}: {
  preview: string;
  onChange: (file: File, preview: string) => void;
  error?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are allowed");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    const url = URL.createObjectURL(file);
    onChange(file, url);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        Banner Image <span className="text-red-500">*</span>
      </label>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`relative cursor-pointer rounded-xl border-2 border-dashed transition-all overflow-hidden ${
          dragging ? "border-orange-400 bg-orange-50" :
          error ? "border-red-400 bg-red-50" :
          "border-gray-300 bg-gray-50 hover:border-orange-400 hover:bg-orange-50/40"
        }`}
      >
        {preview ? (
          <div className="relative w-full h-44">
            <Image src={preview} alt="Preview" fill unoptimized className="object-cover" />
            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <Icon icon="mdi:camera-retake-outline" className="w-8 h-8 text-white mb-1" />
              <p className="text-white text-sm font-medium">Change Image</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
            <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mb-3">
              <Icon icon="mdi:cloud-upload-outline" className="w-7 h-7 text-orange-500" />
            </div>
            <p className="text-sm font-semibold text-gray-700">Drag & drop or click to upload</p>
            <p className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP — max 5MB</p>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) processFile(f);
          e.target.value = "";
        }}
      />
      {error && (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-red-500">
          <Icon icon="mdi:alert-circle-outline" className="w-3.5 h-3.5" />{error}
        </p>
      )}
    </div>
  );
}

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<Banner | null>(null);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const clearError = (field: string) =>
    setErrors((p) => { const n = { ...p }; delete n[field]; return n; });

  const fetchBanners = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const res = await axiosInstance.get("/banners", getConfig());
      if (res.data.success) {
        setBanners(res.data.data.banners);
        setSummary(res.data.data.summary);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to fetch banners");
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBanners(); }, [fetchBanners]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = "Title is required";
    if (!form.imageFile && !selected?.image) errs.image = "Banner image is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const buildFormData = () => {
    const fd = new FormData();
    fd.append("title", form.title.trim());
    fd.append("description", form.description.trim());
    if (form.imageFile) fd.append("banner", form.imageFile);
    return fd;
  };

  const authHeaders = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
    return { Authorization: `Bearer ${token}` };
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setFormLoading(true);
    try {
      const res = await axiosInstance.post("/banners", buildFormData(), {
        headers: { ...authHeaders(), "Content-Type": "multipart/form-data" },
      });
      if (res.data.success) {
        toast.success("Banner created successfully");
        setIsAddOpen(false);
        setForm(emptyForm);
        fetchBanners(false);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to create banner");
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setFormLoading(true);
    try {
      const res = await axiosInstance.put(`/banners/${selected?._id}`, buildFormData(), {
        headers: { ...authHeaders(), "Content-Type": "multipart/form-data" },
      });
      if (res.data.success) {
        toast.success("Banner updated successfully");
        setIsEditOpen(false);
        setForm(emptyForm);
        fetchBanners(false);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update banner");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setFormLoading(true);
    try {
      const res = await axiosInstance.delete(`/banners/${selected._id}`, getConfig());
      if (res.data.success) {
        toast.success("Banner deleted");
        setIsDeleteOpen(false);
        fetchBanners(false);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete banner");
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggle = async (banner: Banner) => {
    setBanners((p) => p.map((b) => b._id === banner._id ? { ...b, isActive: !b.isActive } : b));
    try {
      await axiosInstance.patch(`/banners/${banner._id}/toggle`, {}, getConfig());
      toast.success(`Banner ${!banner.isActive ? "activated" : "deactivated"}`);
      fetchBanners(false);
    } catch {
      setBanners((p) => p.map((b) => b._id === banner._id ? { ...b, isActive: banner.isActive } : b));
      toast.error("Failed to toggle status");
    }
  };

  const openEdit = (banner: Banner) => {
    setSelected(banner);
    setForm({ title: banner.title, description: banner.description, imageFile: null, imagePreview: "" });
    setErrors({});
    setIsEditOpen(true);
  };

  const openAdd = () => {
    setForm(emptyForm);
    setErrors({});
    setIsAddOpen(true);
  };

  const closeModal = () => { setIsAddOpen(false); setIsEditOpen(false); };

  const atLimit = (summary?.total ?? 0) >= MAX_BANNERS;

  const inputCls = (field: string) =>
    `w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all bg-gray-50/50 focus:bg-white ${
      errors[field]
        ? "border-red-400 focus:ring-red-500/20 focus:border-red-500"
        : "border-gray-200 focus:ring-orange-500/20 focus:border-orange-500"
    }`;

  const bannerImgSrc = (img: string) =>
    img.startsWith("http") ? img : `${API_BASE}${img}`;

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              Banners
            </h1>
            <p className="text-sm text-gray-500 mt-1">Manage promotional banners displayed in the app.</p>
          </div>
          <button
            disabled={atLimit}
            onClick={openAdd}
            title={atLimit ? `Maximum ${MAX_BANNERS} banners allowed` : "Add Banner"}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:-translate-y-0.5 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            <Icon icon="mdi:plus-thick" className="w-5 h-5" />
            Add Banner
          </button>
        </div>

        {atLimit && (
          <div className="flex items-center gap-3 px-5 py-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800">
            <Icon icon="mdi:alert-circle-outline" className="w-5 h-5 flex-shrink-0 text-amber-500" />
            <p className="text-sm font-medium">
              You've reached the maximum limit of <strong>{MAX_BANNERS} banners</strong>. Delete one to add a new one.
            </p>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Banners", value: summary?.total ?? 0, icon: "mdi:image-multiple-outline", color: "blue" },
            { label: "Active", value: summary?.active ?? 0, icon: "mdi:check-circle-outline", color: "emerald" },
            { label: "Inactive", value: summary?.inactive ?? 0, icon: "mdi:pause-circle-outline", color: "gray" },
            { label: "Remaining Slots", value: summary?.remainingSlots ?? MAX_BANNERS, icon: "mdi:slot-machine", color: "purple" },
          ].map((card) => (
            <div key={card.label} className="bg-white/80 backdrop-blur-xl border border-gray-100 rounded-2xl p-5 shadow-sm">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                card.color === "blue" ? "bg-blue-50" :
                card.color === "emerald" ? "bg-emerald-50" :
                card.color === "gray" ? "bg-gray-100" : "bg-purple-50"
              }`}>
                <Icon icon={card.icon} className={`w-5 h-5 ${
                  card.color === "blue" ? "text-blue-500" :
                  card.color === "emerald" ? "text-emerald-500" :
                  card.color === "gray" ? "text-gray-500" : "text-purple-500"
                }`} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white/80 backdrop-blur-xl border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
          {loading ? <TableSkeleton /> : banners.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Image</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Title</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Description</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Created</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {banners.map((banner) => (
                    <tr key={banner._id} className="hover:bg-gray-50/80 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="relative w-28 h-16 bg-gray-100 rounded-xl overflow-hidden border border-gray-200/50 shadow-sm">
                          <Image
                            src={bannerImgSrc(banner.image)}
                            alt={banner.title}
                            fill
                            unoptimized
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => { (e.target as HTMLImageElement).src = "https://placehold.co/400x200?text=Banner"; }}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-gray-900 max-w-[180px] truncate">{banner.title}</p>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <p className="text-sm text-gray-500 max-w-[220px] truncate">{banner.description || "—"}</p>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggle(banner)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                            banner.isActive
                              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/50"
                              : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200/50"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${banner.isActive ? "bg-emerald-500" : "bg-gray-400"}`} />
                          {banner.isActive ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="px-6 py-4 hidden sm:table-cell">
                        <span className="text-sm text-gray-500">
                          {new Date(banner.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEdit(banner)} className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all" title="Edit">
                            <Icon icon="mdi:pencil-outline" className="w-5 h-5" />
                          </button>
                          <button onClick={() => { setSelected(banner); setIsDeleteOpen(true); }} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all" title="Delete">
                            <Icon icon="mdi:trash-can-outline" className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-16 px-6">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon icon="mdi:image-off-outline" className="w-10 h-10 text-gray-400" />
              </div>
              <p className="text-lg font-semibold text-gray-900">No banners yet</p>
              <p className="text-gray-500 mt-2">Add your first banner to get started.</p>
              <button onClick={openAdd} className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-orange-50 text-orange-700 hover:bg-orange-100 rounded-xl font-medium transition-colors">
                <Icon icon="mdi:plus" className="w-5 h-5" />
                Add Banner
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Add / Edit Modal ── */}
      {(isAddOpen || isEditOpen) && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {isAddOpen ? "Add Banner" : "Edit Banner"}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                <Icon icon="mdi:close" className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={isAddOpen ? handleAdd : handleEdit} className="p-6 space-y-5">
              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => { setForm((p) => ({ ...p, title: e.target.value })); clearError("title"); }}
                  placeholder="e.g. Summer Sale Banner"
                  className={inputCls("title")}
                />
                {errors.title && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-red-500">
                    <Icon icon="mdi:alert-circle-outline" className="w-3.5 h-3.5" />{errors.title}
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Optional description..."
                  rows={3}
                  className={inputCls("description") + " resize-none"}
                />
              </div>

              {/* Image Upload */}
              <ImageUploader
                preview={
                  form.imagePreview ||
                  (isEditOpen && selected?.image ? bannerImgSrc(selected.image) : "")
                }
                onChange={(file, preview) => {
                  setForm((p) => ({ ...p, imageFile: file, imagePreview: preview }));
                  clearError("image");
                }}
                error={errors.image}
              />

              {isEditOpen && !form.imagePreview && selected?.image && (
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Icon icon="mdi:information-outline" className="w-3.5 h-3.5 text-blue-400" />
                  Leave empty to keep the current image. Upload a new file to replace it.
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 px-4 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 font-semibold shadow-lg shadow-orange-500/30 transition-all disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {formLoading ? (
                    <><Icon icon="mdi:loading" className="w-5 h-5 animate-spin" />{isAddOpen ? "Creating..." : "Saving..."}</>
                  ) : isAddOpen ? "Create Banner" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {isDeleteOpen && selected && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon icon="mdi:trash-can-outline" className="w-7 h-7 text-red-500" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 text-center">Delete Banner?</h2>
            <p className="text-sm text-gray-500 text-center mt-2">
              Are you sure you want to delete <strong>"{selected.title}"</strong>? This cannot be undone.
            </p>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setIsDeleteOpen(false)} className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-semibold transition-colors">
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={formLoading}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 font-semibold transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {formLoading ? <><Icon icon="mdi:loading" className="w-5 h-5 animate-spin" />Deleting...</> : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
