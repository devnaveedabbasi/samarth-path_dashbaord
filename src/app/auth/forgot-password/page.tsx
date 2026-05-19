// app/forgot-password/page.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { z } from "zod";
import InputField from "@/components/ui/InputFeild";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { forgotPassword } from "@/store/slices/auth";
import toast from "react-hot-toast";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { loading } = useAppSelector((state) => state.auth);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    const result = await dispatch(forgotPassword(data.email));
    
    if (forgotPassword.fulfilled.match(result)) {
      // Store email in sessionStorage for later use
      sessionStorage.setItem('resetEmail', data.email);
      router.push(`/auth/verify-reset-password?email=${encodeURIComponent(data.email)}`);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-primary-500">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 relative overflow-hidden">
        <div className="relative z-10 flex flex-col items-center justify-center w-full h-full px-10 text-center">
          <div className="relative mb-2 w-full max-w-xs scale-130">
            <Image
              src="/assets/img/auth/1.png"
              alt="KajNow Illustration"
              width={580}
              height={580}
              className="drop-shadow-2xl mx-auto"
              priority
            />
          </div>
          <div className="max-w-sm space-y-4">
            <h1 className="text-4xl font-bold text-white tracking-tight">
              Forgot Password?
            </h1>
            <p className="text-white/80 text-[17px] leading-relaxed">
              Don't worry! We'll help you reset your password and get back to managing your jobs.
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex rounded-l-4xl bg-[#FFF6F0] items-center justify-center p-10 lg:p-20 overflow-auto">
        <div className="w-full max-w-md">
          {/* Mobile Header */}
          <div className="flex lg:hidden justify-center mb-8">
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 bg-primary-600 rounded-2xl flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-3xl">KJ</span>
              </div>
              <p className="text-primary-700 font-semibold mt-1.5 text-sm tracking-widest">KAJNOW</p>
            </div>
          </div>

          <div className="flex flex-col space-y-4">
            <div className="text-center mb-8">
              <div>
                <Image
                  src="/assets/img/logo.png"
                  alt="KajNow Logo"
                  width={48}
                  height={48}
                  className="mx-auto mb-2"
                />
              </div>
              <h2 className="text-3xl font-semibold text-gray-900">Reset Password</h2>
              <p className="text-gray-500 mt-2 text-sm">
                Enter your email address and we'll send you a verification code
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <InputField
                label="Email Address"
                type="email"
                placeholder="you@example.com"
                required
                error={errors.email?.message}
                {...register("email")}
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary-600 hover:bg-primary-700 active:bg-primary-800 
                         disabled:bg-primary-400 transition-all duration-200 text-white font-semibold 
                         py-3.5 rounded-2xl shadow-lg shadow-primary-200 hover:shadow-xl 
                         text-base mt-3 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-3">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Sending Code...
                  </span>
                ) : (
                  "Send Verification Code"
                )}
              </button>
            </form>

            <div className="text-center mt-4">
              <Link 
                href="/auth/login" 
                className="text-sm text-primary-600 hover:text-primary-700 font-semibold transition-colors"
              >
                ← Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}