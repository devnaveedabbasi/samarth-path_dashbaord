"use client";

import React, { useState, useEffect, useRef } from "react";
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
  description: Yup.string().min(2, "Min 10 characters").max(500, "Max 500 characters").required("Description is required"),
  scheduledDate: Yup.string().required("Publish date is required"),
  hasListenOnlyMode: Yup.boolean().default(true),
});

type FormValues = Yup.InferType<typeof schema>;

export default function EditVideoPage() {
  const router = useRouter();
  const { id } = useParams();
  const [fetching, setFetching] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Existing from server
  const [existingFiles, setExistingFiles] = useState({ videoUrl: "", thumbnail: "" });

  // New video
  const [newVideoFile, setNewVideoFile] = useState<File | null>(null);
  const [newVideoPreview, setNewVideoPreview] = useState<string | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // New thumbnail
  const [newThumbnailFile, setNewThumbnailFile] = useState<File | null>(null);
  const [newThumbnailPreview, setNewThumbnailPreview] = useState<string | null>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: yupResolver(schema) });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axiosInstance.get(`/daily-content/video/${id}`, getConfig());
        const data = res.data.data;
        reset({
          title: data.videoContent.title,
          description: data.videoContent.description,
          scheduledDate: data.date.split("T")[0],
          hasListenOnlyMode: data.videoContent.hasListenOnlyMode,
        });
        setExistingFiles({
          videoUrl: data.videoContent.videoUrl,
          thumbnail: data.videoContent.thumbnail,
        });
      } catch {
        toast.error("Failed to load video data");
        router.back();
      } finally {
        setFetching(false);
      }
    };
    fetchData();
  }, [id, router, reset]);

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size / (1024 * 1024) > 10) {
      toast.error("Video is too large! Max 10MB.");
      e.target.value = "";
      return;
    }
    const videoEl = document.createElement("video");
    videoEl.preload = "metadata";
    videoEl.onloadedmetadata = () => {
      URL.revokeObjectURL(videoEl.src);
      if (videoEl.duration > 420) {
        toast.error("Video exceeds 7 minutes!");
        e.target.value = "";
        return;
      }
      if (newVideoPreview) URL.revokeObjectURL(newVideoPreview);
      setNewVideoFile(file);
      setNewVideoPreview(URL.createObjectURL(file));
    };
    videoEl.src = URL.createObjectURL(file);
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewThumbnailFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setNewThumbnailPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemoveVideo = () => {
    if (newVideoPreview) URL.revokeObjectURL(newVideoPreview);
    setNewVideoFile(null);
    setNewVideoPreview(null);
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const handleRemoveThumbnail = () => {
    setNewThumbnailFile(null);
    setNewThumbnailPreview(null);
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
  };

  const onSubmit = async (values: FormValues) => {
    setUpdating(true);
    try {
      const data = new FormData();
      data.append("title", values.title);
      data.append("description", values.description);
      data.append("date", values.scheduledDate);
      data.append("hasListenOnlyMode", String(values.hasListenOnlyMode));
      if (newVideoFile) data.append("video", newVideoFile);
      if (newThumbnailFile) data.append("image", newThumbnailFile);

      await axiosInstance.put(`/daily-content/video/${id}`, data, {
        ...getConfig(),
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Video updated successfully!");
      router.push("/dashboard/video");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update");
    } finally {
      setUpdating(false);
    }
  };

  const ErrorMsg = ({ msg }: { msg?: string }) =>
    msg ? <p className="text-red-500 text-xs mt-1">{msg}</p> : null;

  const inputStyle = (hasError: boolean) =>
    `w-full h-11 px-4 rounded-xl border outline-none transition-all focus:ring-2 focus:ring-primary-500 ${hasError ? "border-red-400 bg-red-50" : "border-gray-200"}`;

  if (fetching) {
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
          <button type="button" onClick={() => router.back()} className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 shadow-sm">
            <Icon icon="mdi:arrow-left" className="w-6 h-6 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Video Content</h1>
            <p className="text-sm text-gray-500">Update your video details below.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5">

            {/* Title & Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Title</label>
                <input type="text" {...register("title")} className={inputStyle(!!errors.title)} placeholder="Enter title" />
                <ErrorMsg msg={errors.title?.message} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Scheduled Date</label>
                <input type="date" {...register("scheduledDate")} className={inputStyle(!!errors.scheduledDate)} />
                <ErrorMsg msg={errors.scheduledDate?.message} />
              </div>
            </div>

            {/* Video & Thumbnail */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* Video */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  {newVideoPreview ? "New Video" : "Current Video"}
                </label>
                {newVideoPreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-gray-200">
                    <video src={newVideoPreview} className="w-full h-40 object-cover" controls />
                    <div className="absolute top-2 right-2 flex gap-1.5">
                      <label htmlFor="video-change" className="p-1.5 bg-white rounded-lg shadow cursor-pointer hover:bg-gray-50">
                        <Icon icon="mdi:pencil" className="w-4 h-4 text-gray-600" />
                        <input id="video-change" ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoChange} className="hidden" />
                      </label>
                      <button type="button" onClick={handleRemoveVideo} className="p-1.5 bg-white rounded-lg shadow hover:bg-red-50">
                        <Icon icon="mdi:trash-can-outline" className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                    <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded-lg truncate max-w-[80%]">
                      {newVideoFile?.name}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <video src={existingFiles.videoUrl} className="w-full h-40 object-cover rounded-xl border border-gray-200" controls />
                    <label htmlFor="video-replace" className="flex items-center justify-center gap-2 w-full h-10 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-all text-sm text-gray-500">
                      <Icon icon="mdi:cloud-upload-outline" className="w-4 h-4" />
                      Replace video
                      <input id="video-replace" ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoChange} className="hidden" />
                    </label>
                  </div>
                )}
              </div>

              {/* Thumbnail */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  {newThumbnailPreview ? "New Thumbnail" : "Current Thumbnail"}
                </label>
                {newThumbnailPreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-gray-200">
                    <img src={newThumbnailPreview} alt="New Thumbnail" className="w-full h-40 object-cover" />
                    <div className="absolute top-2 right-2 flex gap-1.5">
                      <label htmlFor="thumb-change" className="p-1.5 bg-white rounded-lg shadow cursor-pointer hover:bg-gray-50">
                        <Icon icon="mdi:pencil" className="w-4 h-4 text-gray-600" />
                        <input id="thumb-change" ref={thumbnailInputRef} type="file" accept="image/*" onChange={handleThumbnailChange} className="hidden" />
                      </label>
                      <button type="button" onClick={handleRemoveThumbnail} className="p-1.5 bg-white rounded-lg shadow hover:bg-red-50">
                        <Icon icon="mdi:trash-can-outline" className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                    <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded-lg truncate max-w-[80%]">
                      {newThumbnailFile?.name}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <img src={existingFiles.thumbnail} alt="Current Thumbnail" className="w-full h-40 object-cover rounded-xl border border-gray-200" />
                    <label htmlFor="thumb-replace" className="flex items-center justify-center gap-2 w-full h-10 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-all text-sm text-gray-500">
                      <Icon icon="mdi:cloud-upload-outline" className="w-4 h-4" />
                      Replace thumbnail
                      <input id="thumb-replace" ref={thumbnailInputRef} type="file" accept="image/*" onChange={handleThumbnailChange} className="hidden" />
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
              <textarea
                {...register("description")}
                rows={4}
                placeholder="Write the content details here..."
                className={`w-full p-4 rounded-xl border outline-none resize-none focus:ring-2 focus:ring-primary-500 ${errors.description ? "border-red-400 bg-red-50" : "border-gray-200"}`}
              />
              <ErrorMsg msg={errors.description?.message} />
            </div>

            {/* Listen Only Mode */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...register("hasListenOnlyMode")} className="w-4 h-4 accent-primary-600" />
              <span className="text-sm font-semibold text-gray-700">Enable Listen Only Mode</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button variant="secondary" type="button" onClick={() => router.back()} disabled={updating}>Cancel</Button>
            <Button type="submit" loading={updating} icon="mdi:content-save">Save Changes</Button>
          </div>
        </form>
      </div>
    </div>
  );
}