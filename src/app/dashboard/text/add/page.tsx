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
  label: Yup.string().min(2, "Min 2 characters").max(50, "Max 50 characters").required("Label is required"),
  scheduledDate: Yup.string().required("Publish date is required"),
  description: Yup.string().min(10, "Min 10 characters").max(1000, "Max 1000 characters").required("Description is required"),
});

type FormValues = Yup.InferType<typeof schema>;

export default function AddTextPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: yupResolver(schema),
    defaultValues: {
      scheduledDate: new Date().toISOString().split("T")[0],
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      const data = new FormData();
      data.append("title", values.title);
      data.append("description", values.description);
      data.append("label", values.label);
      data.append("scheduledDate", values.scheduledDate);
      data.append("unlocksAt", "08:00");
      if (imageFile) data.append("image", imageFile);

      const response = await axiosInstance.post("/daily-content/text", data, {
        ...getConfig(),
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data.success) {
        toast.success("Text Content Scheduled Successfully!");
        router.push("/dashboard/text");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  const ErrorMsg = ({ msg }: { msg?: string }) =>
    msg ? <p className="text-red-500 text-xs mt-1">{msg}</p> : null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm"
          >
            <Icon icon="mdi:arrow-left" className="w-6 h-6 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Add Text Content</h1>
            <p className="text-sm text-gray-500">Enter your update and label details below.</p>
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
                placeholder="Enter title (e.g., Daily Morning Update)"
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
                  placeholder="e.g., Latest, Urgent, Special"
                  className={`w-full h-11 px-4 rounded-xl border outline-none transition-all focus:ring-2 focus:ring-primary-500 ${errors.label ? "border-red-400 bg-red-50" : "border-gray-200"}`}
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

            {/* Image Upload with Preview */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Image</label>
              {!imagePreview ? (
                <label
                  htmlFor="image-upload"
                  className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-all"
                >
                  <Icon icon="mdi:cloud-upload-outline" className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-500">Click to upload an image</span>
                  <span className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP supported</span>
                  <input id="image-upload" ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </label>
              ) : (
                <div className="relative w-full rounded-xl overflow-hidden border border-gray-200">
                  <img src={imagePreview} alt="Preview" className="w-full max-h-64 object-cover" />
                  <div className="absolute top-2 right-2 flex gap-2">
                    <label htmlFor="image-upload-change" className="p-1.5 bg-white rounded-lg shadow cursor-pointer hover:bg-gray-50 transition-all" title="Change image">
                      <Icon icon="mdi:pencil" className="w-4 h-4 text-gray-600" />
                      <input id="image-upload-change" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                    </label>
                    <button type="button" onClick={handleRemoveImage} className="p-1.5 bg-white rounded-lg shadow hover:bg-red-50 transition-all">
                      <Icon icon="mdi:trash-can-outline" className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                  <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded-lg truncate max-w-[80%]">
                    {imageFile?.name}
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
              <textarea
                {...register("description")}
                rows={5}
                placeholder="Write the content details here..."
                className={`w-full p-4 rounded-xl border outline-none transition-all resize-none focus:ring-2 focus:ring-primary-500 ${errors.description ? "border-red-400 bg-red-50" : "border-gray-200"}`}
              />
              <ErrorMsg msg={errors.description?.message} />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button variant="secondary" type="button" onClick={() => router.back()} disabled={loading}>Cancel</Button>
            <Button type="submit" loading={loading} icon="mdi:send-clock">Schedule Post</Button>
          </div>
        </form>
      </div>
    </div>
  );
}