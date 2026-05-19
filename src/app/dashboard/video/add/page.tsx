"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
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
  description: Yup.string().min(10, "Min 10 characters").max(500, "Max 500 characters").required("Description is required"),
  scheduledDate: Yup.string().required("Publish date is required"),
  hasListenOnlyMode: Yup.boolean().default(true),
});

type FormValues = Yup.InferType<typeof schema>;

export default function AddVideoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Video state
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Thumbnail state
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: yupResolver(schema),
    defaultValues: {
      scheduledDate: new Date().toISOString().split("T")[0],
      hasListenOnlyMode: true,
    },
  });

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
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
    };
    videoEl.src = URL.createObjectURL(file);
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setThumbnailFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setThumbnailPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemoveVideo = () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoFile(null);
    setVideoPreview(null);
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const handleRemoveThumbnail = () => {
    setThumbnailFile(null);
    setThumbnailPreview(null);
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
  };

  const onSubmit = async (values: FormValues) => {
    if (!videoFile) return toast.error("Please select a video file.");
    if (!thumbnailFile) return toast.error("Please select a thumbnail.");

    setLoading(true);
    try {
      const data = new FormData();
      data.append("title", values.title);
      data.append("description", values.description);
      data.append("date", values.scheduledDate);
      data.append("hasListenOnlyMode", String(values.hasListenOnlyMode));
      data.append("video", videoFile);
      data.append("image", thumbnailFile);

      await axiosInstance.post("/daily-content/video", data, {
        ...getConfig(),
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Video Content Scheduled Successfully!");
      router.push("/dashboard/video");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to upload video");
    } finally {
      setLoading(false);
    }
  };

  const ErrorMsg = ({ msg }: { msg?: string }) =>
    msg ? <p className="text-red-500 text-xs mt-1">{msg}</p> : null;

  const inputStyle = (hasError: boolean) =>
    `w-full h-11 px-4 rounded-xl border outline-none transition-all focus:ring-2 focus:ring-primary-500 ${hasError ? "border-red-400 bg-red-50" : "border-gray-200"}`;

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button type="button" onClick={() => router.back()} className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 shadow-sm">
            <Icon icon="mdi:arrow-left" className="w-6 h-6 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Add Video Content</h1>
            <p className="text-sm text-gray-500">Max 10MB | Max 7 Minutes</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5">

            {/* Title & Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Title</label>
                <input type="text" {...register("title")} placeholder="Enter title" className={inputStyle(!!errors.title)} />
                <ErrorMsg msg={errors.title?.message} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Publish Date</label>
                <input type="date" {...register("scheduledDate")} min={new Date().toISOString().split("T")[0]} className={inputStyle(!!errors.scheduledDate)} />
                <ErrorMsg msg={errors.scheduledDate?.message} />
              </div>
            </div>

            {/* Video & Thumbnail Upload */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* Video */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Video File <span className="text-xs font-normal text-gray-400">(Max 10MB / 7min)</span>
                </label>
                {videoPreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-gray-200">
                    <video src={videoPreview} className="w-full h-40 object-cover" controls />
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
                      {videoFile?.name}
                    </div>
                  </div>
                ) : (
                  <label htmlFor="video-upload" className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-all">
                    <Icon icon="mdi:video-plus-outline" className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-500">Click to upload video</span>
                    <span className="text-xs text-gray-400 mt-1">MP4, MOV, WEBM</span>
                    <input id="video-upload" ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoChange} className="hidden" />
                  </label>
                )}
              </div>

              {/* Thumbnail */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Thumbnail</label>
                {thumbnailPreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-gray-200">
                    <img src={thumbnailPreview} alt="Thumbnail Preview" className="w-full h-40 object-cover" />
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
                      {thumbnailFile?.name}
                    </div>
                  </div>
                ) : (
                  <label htmlFor="thumb-upload" className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-all">
                    <Icon icon="mdi:image-plus-outline" className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-500">Click to upload thumbnail</span>
                    <span className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP</span>
                    <input id="thumb-upload" ref={thumbnailInputRef} type="file" accept="image/*" onChange={handleThumbnailChange} className="hidden" />
                  </label>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
              <textarea
                {...register("description")}
                rows={5}
                placeholder="Write content details here..."
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

          <div className="flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={() => router.back()} disabled={loading}>Cancel</Button>
            <Button type="submit" loading={loading} icon="mdi:cloud-upload">
              {loading ? "Uploading..." : "Upload Video"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}