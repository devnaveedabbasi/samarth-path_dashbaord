"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Icon } from "@iconify/react";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as Yup from "yup";
import axiosInstance from "@/config/axiosInstance";
import { getConfig } from "@/store/slicer";
import Button from "@/components/ui/Button";

const schema = Yup.object({
  title: Yup.string().min(2, "Min 2 characters").max(100, "Max 100 characters").required("Title is required"),
  label: Yup.string().min(2, "Min 2 characters").max(50, "Max 50 characters").required("Label is required"),
  scheduledDate: Yup.string().required("Publish date is required"),
  description: Yup.string().min(10, "Min 10 characters").max(1000, "Max 1000 characters").required("Description is required"),
});

type FormValues = Yup.InferType<typeof schema>;

export default function EditTextPage() {
  const router = useRouter();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [existingImage, setExistingImage] = useState("");
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: yupResolver(schema) });

  const fetchContentDetails = useCallback(async () => {
    try {
      const response = await axiosInstance.get(`/daily-content/text/${id}`, getConfig());
      if (response.data.success) {
        const data = response.data.data;
        reset({
          title: data.textContent?.title || "",
          description: data.textContent?.description || "",
          label: data.textContent?.label || "",
          scheduledDate: data.date ? new Date(data.date).toISOString().split("T")[0] : "",
        });
        setExistingImage(data.textContent?.image || "");
      }
    } catch {
      toast.error("Failed to load content details");
      router.push("/dashboard/text");
    } finally {
      setLoading(false);
    }
  }, [id, router, reset]);

  useEffect(() => { if (id) fetchContentDetails(); }, [id, fetchContentDetails]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setNewImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveNewImage = () => {
    setNewImageFile(null);
    setNewImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onSubmit = async (values: FormValues) => {
    setUpdating(true);
    try {
      let response;
      if (newImageFile) {
        const data = new FormData();
        data.append("title", values.title);
        data.append("description", values.description);
        data.append("label", values.label);
        data.append("scheduledDate", values.scheduledDate);
        data.append("unlocksAt", "08:00");
        data.append("image", newImageFile);
        response = await axiosInstance.put(`/daily-content/text/${id}`, data, {
          ...getConfig(),
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        response = await axiosInstance.put(`/daily-content/text/${id}`, values, getConfig());
      }
      if (response.data.success) {
        toast.success("Content updated successfully!");
        router.push("/dashboard/text");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update content");
    } finally {
      setUpdating(false);
    }
  };

  const ErrorMsg = ({ msg }: { msg?: string }) =>
    msg ? <p className="text-red-500 text-xs mt-1">{msg}</p> : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button type="button" onClick={() => router.back()} className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm">
            <Icon icon="mdi:arrow-left" className="w-6 h-6 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Text Content</h1>
            <p className="text-sm text-gray-500">Modify the details of your scheduled update.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5">

            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Title</label>
              <input
                type="text"
                {...register("title")}
                placeholder="Enter title"
                className={`w-full h-11 px-4 rounded-xl border outline-none transition-all focus:ring-2 focus:ring-primary-500 ${errors.title ? "border-red-400 bg-red-50" : "border-gray-200"}`}
              />
              <ErrorMsg msg={errors.title?.message} />
            </div>

            {/* Label & Publish Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Label</label>
                <input
                  type="text"
                  {...register("label")}
                  placeholder="e.g., Latest, Urgent"
                  className={`w-full h-11 px-4 rounded-xl border outline-none focus:ring-2 focus:ring-primary-500 ${errors.label ? "border-red-400 bg-red-50" : "border-gray-200"}`}
                />
                <ErrorMsg msg={errors.label?.message} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Publish Date</label>
                <input
                  type="date"
                  {...register("scheduledDate")}
                  min={new Date().toISOString().split("T")[0]}
                  className={`w-full h-11 px-4 rounded-xl border outline-none focus:ring-2 focus:ring-primary-500 ${errors.scheduledDate ? "border-red-400 bg-red-50" : "border-gray-200"}`}
                />
                <ErrorMsg msg={errors.scheduledDate?.message} />
              </div>
            </div>

            {/* Image Section */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                {newImagePreview ? "New Image" : "Current Image"}
              </label>
              {newImagePreview ? (
                <div className="relative rounded-xl overflow-hidden border border-gray-200">
                  <img src={newImagePreview} alt="New Preview" className="w-full max-h-64 object-cover" />
                  <div className="absolute top-2 right-2 flex gap-2">
                    <label htmlFor="img-change" className="p-1.5 bg-white rounded-lg shadow cursor-pointer hover:bg-gray-50 transition-all">
                      <Icon icon="mdi:pencil" className="w-4 h-4 text-gray-600" />
                      <input id="img-change" ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                    </label>
                    <button type="button" onClick={handleRemoveNewImage} className="p-1.5 bg-white rounded-lg shadow hover:bg-red-50 transition-all">
                      <Icon icon="mdi:trash-can-outline" className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                  <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded-lg truncate max-w-[80%]">
                    {newImageFile?.name}
                  </div>
                </div>
              ) : existingImage ? (
                <div className="space-y-2">
                  <img src={existingImage} alt="Current" className="w-full max-h-64 object-cover rounded-xl border border-gray-200" />
                  <label htmlFor="img-replace" className="flex items-center justify-center gap-2 w-full h-10 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-all text-sm text-gray-500">
                    <Icon icon="mdi:cloud-upload-outline" className="w-4 h-4" />
                    Replace image
                    <input id="img-replace" ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  </label>
                </div>
              ) : (
                <label htmlFor="img-empty" className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-all">
                  <Icon icon="mdi:cloud-upload-outline" className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-500">Click to upload an image</span>
                  <span className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP supported</span>
                  <input id="img-empty" ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </label>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
              <textarea
                {...register("description")}
                rows={5}
                placeholder="Update details..."
                className={`w-full p-4 rounded-xl border outline-none transition-all resize-none focus:ring-2 focus:ring-primary-500 ${errors.description ? "border-red-400 bg-red-50" : "border-gray-200"}`}
              />
              <ErrorMsg msg={errors.description?.message} />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button variant="secondary" type="button" onClick={() => router.back()} disabled={updating}>Cancel</Button>
            <Button type="submit" loading={updating} icon="mdi:content-save-edit">Update Content</Button>
          </div>
        </form>
      </div>
    </div>
  );
}