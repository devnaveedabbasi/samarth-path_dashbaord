"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Icon } from "@iconify/react";
import toast from "react-hot-toast";
import { useForm, useWatch } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as Yup from "yup";
import axiosInstance from "@/config/axiosInstance";
import { getConfig } from "@/store/slicer";
import Button from "@/components/ui/Button";

const schema = Yup.object({
  title: Yup.string().min(2, "Min 2 characters").max(100, "Max 100 characters").required("Title is required"),
  question: Yup.string().min(10, "Min 10 characters").max(500, "Max 500 characters").required("Question is required"),
  option1: Yup.string().min(1, "Required").max(200, "Max 200 characters").required("Option 1 is required"),
  option2: Yup.string().min(1, "Required").max(200, "Max 200 characters").required("Option 2 is required"),
  option3: Yup.string().min(1, "Required").max(200, "Max 200 characters").required("Option 3 is required"),
  option4: Yup.string().min(1, "Required").max(200, "Max 200 characters").required("Option 4 is required"),
  correctOptionId: Yup.string().oneOf(["1", "2", "3", "4"]).required("Select correct option"),
  explanation: Yup.string().max(500, "Max 500 characters").optional(),
  scheduledDate: Yup.string().required("Publish date is required"),
  isActive: Yup.string().oneOf(["true", "false"]).required(),
});

type FormValues = Yup.InferType<typeof schema>;

export default function EditQuizPage() {
  const router = useRouter();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: yupResolver(schema as any),
    defaultValues: {
      correctOptionId: "1",
      isActive: "true",
    },
  });

  const correctOptionId = useWatch({ control, name: "correctOptionId" });

  const fetchQuizDetails = useCallback(async () => {
    try {
      const response = await axiosInstance.get(`/daily-content/quiz/${id}`, getConfig());
      if (response.data.success) {
        const data = response.data.data;
        const quiz = data.quizContent;

        // Flatten options array → individual fields
        const opts: Record<string, string> = {};
        (quiz?.options || []).forEach((opt: { id: string; text: string }) => {
          opts[`option${opt.id}`] = opt.text;
        });

        reset({
          title: quiz?.title || "",
          question: quiz?.question || "",
          option1: opts["option1"] || "",
          option2: opts["option2"] || "",
          option3: opts["option3"] || "",
          option4: opts["option4"] || "",
          correctOptionId: quiz?.correctOptionId || "1",
          explanation: quiz?.explanation || "",
          scheduledDate: data.date ? new Date(data.date).toISOString().split("T")[0] : "",
          isActive: String(data.isActive ?? true) as "true" | "false",
        });
      }
    } catch {
      toast.error("Failed to load quiz details");
      router.push("/dashboard/quiz");
    } finally {
      setLoading(false);
    }
  }, [id, router, reset]);

  useEffect(() => {
    if (id) fetchQuizDetails();
  }, [id, fetchQuizDetails]);

  const onSubmit = async (values: FormValues) => {
    setUpdating(true);
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
        date: values.scheduledDate,
        unlocksAt: "14:00",
        isActive: values.isActive === "true",
      };

      const response = await axiosInstance.put(`/daily-content/quiz/${id}`, payload, getConfig());
      if (response.data.success) {
        toast.success("Quiz updated successfully!");
        router.push("/dashboard/quiz");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update quiz");
    } finally {
      setUpdating(false);
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
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm"
          >
            <Icon icon="mdi:arrow-left" className="w-6 h-6 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Quiz</h1>
            <p className="text-sm text-gray-500">Modify your daily quiz question and options.</p>
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
                className={inputStyle(!!errors.title)}
                placeholder="e.g., Daily GK Quiz"
              />
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
              {options.map(({ id: optId, field }) => (
                <div key={optId}>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">
                    Option {optId}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      {...register(field)}
                      placeholder={`Choice ${optId}`}
                      className={`w-full h-11 px-4 pr-10 rounded-xl border outline-none transition-all focus:ring-2 focus:ring-primary-500 ${errors[field] ? "border-red-400 bg-red-50" : "border-gray-200"}`}
                    />
                    {correctOptionId === optId && (
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

            {/* Date & Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Publish Date</label>
                <input
                  type="date"
                  {...register("scheduledDate")}
                  className={inputStyle(!!errors.scheduledDate)}
                />
                <ErrorMsg msg={errors.scheduledDate?.message} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Status</label>
                <select
                  {...register("isActive")}
                  className="w-full h-11 px-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
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
            <Button variant="secondary" type="button" onClick={() => router.back()} disabled={updating}>
              Cancel
            </Button>
            <Button type="submit" loading={updating} icon="mdi:content-save-check">
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}