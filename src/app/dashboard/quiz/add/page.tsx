"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import toast from "react-hot-toast";
import { useForm, useWatch } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as Yup from "yup";
import axiosInstance from "@/config/axiosInstance";
import { getConfig } from "@/store/slicer";
import Button from "@/components/ui/Button";

const schema = Yup.object({
  title: Yup.string().min(2, "Min 2 characters").max(200, "Max 200 characters").required("Title is required"),
  question: Yup.string().min(10, "Min 10 characters").max(500, "Max 500 characters").required("Question is required"),
  option1: Yup.string().min(1, "Required").max(200, "Max 200 characters").required("Option 1 is required"),
  option2: Yup.string().min(1, "Required").max(200, "Max 200 characters").required("Option 2 is required"),
  option3: Yup.string().min(1, "Required").max(200, "Max 200 characters").required("Option 3 is required"),
  option4: Yup.string().min(1, "Required").max(200, "Max 200 characters").required("Option 4 is required"),
  correctOptionId: Yup.string().oneOf(["1", "2", "3", "4"]).required("Select correct option"),
  explanation: Yup.string().max(500, "Max 500 characters").optional(),
  date: Yup.string().required("Publish date is required"),
});

type FormValues = Yup.InferType<typeof schema>;

interface PrizeForm {
  title: string;
  description: string;
  imageFile: File | null;
  imagePreview: string;
}

const emptyPrizeForm: PrizeForm = { title: "", description: "", imageFile: null, imagePreview: "" };

export default function AddQuizPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Step 2: mandatory Daily Prize for the quiz just created
  const [step, setStep] = useState<1 | 2>(1);
  const [createdQuiz, setCreatedQuiz] = useState<{ id: string; question: string } | null>(null);
  const [prizeForm, setPrizeForm] = useState<PrizeForm>(emptyPrizeForm);
  const [prizeError, setPrizeError] = useState<string | undefined>(undefined);
  const [prizeSaving, setPrizeSaving] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: yupResolver(schema as any),
    defaultValues: {
      title: "Daily Quiz",
      question: "",
      option1: "",
      option2: "",
      option3: "",
      option4: "",
      correctOptionId: "1",
      explanation: "",
      date: new Date().toISOString().split("T")[0],
    },
  });

  const correctOptionId = useWatch({ control, name: "correctOptionId" });

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      const payload = {
        title: values.title,
        question: values.question,
        options: [
          { id: "1", text: values.option1 },
          { id: "2", text: values.option2 },
          { id: "3", text: values.option3 },
          { id: "4", text: values.option4 },
        ],
        correctOptionId: values.correctOptionId,
        explanation: values.explanation || "",
        timerSeconds: 180,
        date: values.date,
        unlocksAt: "14:00",
      };

      const response = await axiosInstance.post("/daily-content/quiz", payload, getConfig());
      if (response.data.success) {
        toast.success("Quiz Scheduled! Now add the Daily Prize for it.");
        setCreatedQuiz({ id: response.data.data._id, question: values.question });
        setStep(2);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to schedule quiz");
    } finally {
      setLoading(false);
    }
  };

  const handlePrizeImageChange = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are allowed");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setPrizeForm((p) => ({ ...p, imageFile: file, imagePreview: URL.createObjectURL(file) }));
  };

  const handleSavePrize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prizeForm.title.trim()) {
      setPrizeError("Prize title is required");
      return;
    }
    setPrizeError(undefined);
    setPrizeSaving(true);
    try {
      const formData = new FormData();
      formData.append("title", prizeForm.title.trim());
      formData.append("description", prizeForm.description.trim());
      if (prizeForm.imageFile) formData.append("image", prizeForm.imageFile);

      const response = await axiosInstance.post(
        `/daily-content/quiz/${createdQuiz?.id}/prize`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      if (response.data.success) {
        toast.success("Daily prize added successfully!");
        router.push("/dashboard/quiz");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to add daily prize");
    } finally {
      setPrizeSaving(false);
    }
  };

  const ErrorMsg = ({ msg }: { msg?: string }) =>
    msg ? <p className="text-red-500 text-xs mt-1">{msg}</p> : null;

  const inputStyle = (hasError: boolean) =>
    `w-full h-11 px-4 rounded-xl border outline-none transition-all focus:ring-2 focus:ring-primary-500 ${hasError ? "border-red-400 bg-red-50" : "border-gray-200"}`;

  const options = [
    { id: "1", field: "option1" as const },
    { id: "2", field: "option2" as const },
    { id: "3", field: "option3" as const },
    { id: "4", field: "option4" as const },
  ];

  if (step === 2 && createdQuiz) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] p-6 lg:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Icon icon="mdi:check-bold" className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Step 2: Add Daily Prize</h1>
              <p className="text-sm text-gray-500">
                Quiz "{createdQuiz.question.slice(0, 60)}
                {createdQuiz.question.length > 60 ? "…" : ""}" was scheduled. A daily prize is
                required before you can finish.
              </p>
            </div>
          </div>

          <form onSubmit={handleSavePrize} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Prize Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={prizeForm.title}
                onChange={(e) => {
                  setPrizeForm((p) => ({ ...p, title: e.target.value }));
                  setPrizeError(undefined);
                }}
                placeholder="e.g. Amazon Gift Card - Rs. 500"
                className={inputStyle(!!prizeError)}
              />
              <ErrorMsg msg={prizeError} />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Description <span className="text-gray-400 font-normal text-xs">(Optional)</span>
              </label>
              <textarea
                value={prizeForm.description}
                onChange={(e) => setPrizeForm((p) => ({ ...p, description: e.target.value }))}
                rows={3}
                placeholder="Optional description..."
                className="w-full p-4 rounded-xl border border-gray-200 outline-none transition-all resize-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Prize Image <span className="text-gray-400 font-normal text-xs">(Optional)</span>
              </label>
              <label
                htmlFor="daily-prize-image-upload"
                className="relative cursor-pointer rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 hover:border-primary-400 hover:bg-primary-50/40 transition-all overflow-hidden flex items-center justify-center"
              >
                {prizeForm.imagePreview ? (
                  <div className="relative w-full h-36 group">
                    <img
                      src={prizeForm.imagePreview}
                      alt="Prize preview"
                      className="w-full h-full object-cover"
                    />
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
                  id="daily-prize-image-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePrizeImageChange(file);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button type="submit" loading={prizeSaving} icon="mdi:gift">
                Save Prize & Finish
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

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
            <h1 className="text-2xl font-bold text-gray-900">Add Daily Quiz</h1>
            <p className="text-sm text-gray-500">Create a question with 4 options.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5">

            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Quiz Title</label>
              <input
                type="text"
                {...register("title")}
                disabled={true}
                placeholder="e.g., Daily GK Quiz"
                className={`${inputStyle(!!errors.title)} opacity-60 cursor-not-allowed bg-gray-100 text-gray-500`} />
              <ErrorMsg msg={errors.title?.message} />
            </div>

            {/* Question */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Question</label>
              <textarea
                {...register("question")}
                rows={3}
                placeholder="Enter the quiz question here..."
                className={`w-full p-4 rounded-xl border outline-none transition-all resize-none focus:ring-2 focus:ring-primary-500 ${errors.question ? "border-red-400 bg-red-50" : "border-gray-200"}`}
              />
              <ErrorMsg msg={errors.question?.message} />
            </div>

            {/* Options Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {options.map(({ id, field }) => (
                <div key={id}>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">
                    Option {id}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      {...register(field)}
                      placeholder={`Choice ${id}`}
                      className={`w-full h-11 px-4 pr-10 rounded-xl border outline-none transition-all focus:ring-2 focus:ring-primary-500 ${errors[field] ? "border-red-400 bg-red-50" : "border-gray-200"}`}
                    />
                    {correctOptionId === id && (
                      <Icon icon="mdi:check-circle" className="absolute right-3 top-3 text-emerald-500 w-5 h-5" />
                    )}
                  </div>
                  <ErrorMsg msg={errors[field]?.message} />
                </div>
              ))}
            </div>

            {/* Correct Option & Timer */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Correct Option</label>
                <select
                  {...register("correctOptionId")}
                  className="w-full h-11 px-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                >
                  <option value="1">Option 1</option>
                  <option value="2">Option 2</option>
                  <option value="3">Option 3</option>
                  <option value="4">Option 4</option>
                </select>
                <ErrorMsg msg={errors.correctOptionId?.message} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Timer (Seconds)</label>
                <input
                  type="number"
                  disabled
                  value={180}
                  className="w-full h-11 px-4 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed rounded-xl border border-gray-200 outline-none"
                />
              </div>
            </div>

            {/* Date & Unlock Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Publish Date</label>
                <input
                  type="date"
                  {...register("date")}
                  min={new Date().toISOString().split("T")[0]}
                  className={inputStyle(!!errors.date)}
                />
                <ErrorMsg msg={errors.date?.message} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Unlock Time</label>
                <input
                  type="time"
                  disabled
                  value="14:00"
                  className="w-full h-11 px-4 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed rounded-xl border border-gray-200 outline-none"
                />
              </div>
            </div>

            {/* Explanation */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Explanation <span className="text-gray-400 font-normal text-xs">(Optional)</span>
              </label>
              <textarea
                {...register("explanation")}
                rows={2}
                placeholder="Explain why the answer is correct..."
                className={`w-full p-4 rounded-xl border outline-none transition-all resize-none focus:ring-2 focus:ring-primary-500 ${errors.explanation ? "border-red-400 bg-red-50" : "border-gray-200"}`}
              />
              <ErrorMsg msg={errors.explanation?.message} />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button variant="secondary" type="button" onClick={() => router.back()} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" loading={loading} icon="mdi:send-clock">
              Schedule Quiz
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}