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
  title: Yup.string().min(2, "Min 2 characters").max(100, "Max 100 characters").required("Title is required"),
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

export default function AddQuizPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

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
        toast.success("Quiz Scheduled Successfully!");
        router.push("/dashboard/quiz");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to schedule quiz");
    } finally {
      setLoading(false);
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
                placeholder="e.g., Daily GK Quiz"
                className={inputStyle(!!errors.title)}
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