// app/register/page.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { registerSchema, RegisterFormData } from "@/lib/validations";
import InputField from "@/components/ui/InputFeild";
import Image from "next/image";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { register } from "@/store/slices/auth";
import { setTempEmail } from "@/store/slices/auth";

export default function RegisterPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
const { loading } = useAppSelector((state) => state.auth);
  const {
    register: registerField,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: "onBlur",
    defaultValues: { agreeToTerms: false },
  });

  const password = watch("password", "");

  const passwordStrength = (() => {
    if (!password) return { score: 0, label: "", color: "" };
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    const levels = [
      { score: 1, label: "Weak", color: "bg-red-500" },
      { score: 2, label: "Fair", color: "bg-orange-500" },
      { score: 3, label: "Good", color: "bg-blue-500" },
      { score: 4, label: "Strong", color: "bg-emerald-500" },
    ];
    return levels[score - 1] ?? { score: 0, label: "", color: "" };
  })();

  const onSubmit = async (data: RegisterFormData) => {
    if (!data.agreeToTerms) {
      toast.error("Please agree to the Terms and Privacy Policy");
      return;
    }

    const result = await dispatch(register({
      name: data.fullName,
      email: data.email,
      phone: data.phone,
      password: data.password,
    }));

    if (register.fulfilled.match(result)) {
      dispatch(setTempEmail(data.email));
      router.push(`/auth/verify-otp?email=${encodeURIComponent(data.email)}`);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-primary-500">
      {/* Left Panel - Decorative */}
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
              Welcome to KajNow
            </h1>
            <p className="text-white/80 text-[17px] leading-relaxed">
              Create your account and start managing jobs, 
              earnings, and opportunities effortlessly.
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex rounded-l-4xl bg-[#FFF6F0] items-center justify-center p-10 lg:p-20 overflow-auto">
        <div className="w-full">
          {/* Mobile Header */}
          <div className="flex lg:hidden justify-center mb-8">
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 bg-primary-600 rounded-2xl flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-3xl">KJ</span>
              </div>
              <p className="text-primary-700 font-semibold mt-1.5 text-sm tracking-widest">KAJNOW</p>
            </div>
          </div>

          {/* Main Card */}
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
              <h2 className="text-3xl font-semibold text-gray-900">Create Account</h2>
              <p className="text-gray-500 mt-2 text-sm">
                Join thousands of professionals today
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* 2-Column Grid for Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Full Name */}
                <InputField
                  label="Full Name"
                  type="text"
                  placeholder="Enter your full name"
                  required
                  error={errors.fullName?.message}
                  {...registerField("fullName")}
                />

                {/* Email Address */}
                <InputField
                  label="Email Address"
                  type="email"
                  placeholder="you@example.com"
                  required
                  error={errors.email?.message}
                  {...registerField("email")}
                />

                {/* Phone Number */}
                <div className="md:col-span-2">
                  <InputField
                    label="Phone Number"
                    type="tel"
                    placeholder="+92 300 1234567"
                    required
                    error={errors.phone?.message}
                    {...registerField("phone")}
                  />
                </div>
              </div>

              {/* Password Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <InputField
                    label="Password"
                    type="password"
                    placeholder="Create a strong password"
                    required
                    error={errors.password?.message}
                    {...registerField("password")}
                  />

                  {password && (
                    <div className="px-1 flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden flex gap-px">
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className={`flex-1 h-full transition-all duration-300 rounded-full ${
                              i <= passwordStrength.score ? passwordStrength.color : "bg-transparent"
                            }`}
                          />
                        ))}
                      </div>
                      <span
                        className={`text-xs font-semibold px-3 py-0.5 rounded-full whitespace-nowrap ${
                          passwordStrength.score === 1
                            ? "text-red-600 bg-red-50"
                            : passwordStrength.score === 2
                            ? "text-orange-600 bg-orange-50"
                            : passwordStrength.score === 3
                            ? "text-blue-600 bg-blue-50"
                            : "text-emerald-600 bg-emerald-50"
                        }`}
                      >
                        {passwordStrength.label}
                      </span>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <InputField
                  label="Confirm Password"
                  type="password"
                  placeholder="Re-enter password"
                  required
                  error={errors.confirmPassword?.message}
                  {...registerField("confirmPassword")}
                />
              </div>

              {/* Terms Checkbox */}
              <div className="pt-2">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="mt-0.5 w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-2 focus:ring-primary-500 accent-primary-600 transition-colors"
                    {...registerField("agreeToTerms")}
                  />
                  <span className="text-sm text-gray-600 leading-snug">
                    I agree to KajNow&apos;s{" "}
                    <Link href="/terms" className="text-primary-600 hover:underline font-medium transition-colors">
                      Terms
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy" className="text-primary-600 hover:underline font-medium transition-colors">
                      Privacy Policy
                    </Link>
                  </span>
                </label>
                {errors.agreeToTerms?.message && (
                  <p className="text-red-500 text-xs mt-1 ml-8">
                    {errors.agreeToTerms.message}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary-600 hover:bg-primary-700 active:bg-primary-800 disabled:bg-primary-400 
                         transition-all duration-200 text-white font-semibold py-3.5 rounded-2xl shadow-lg 
                         shadow-primary-200 hover:shadow-xl text-base mt-3 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-3">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Creating Account...
                  </span>
                ) : (
                  "Create My Account"
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="my-6 flex items-center gap-2">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 font-medium">OR</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Login Link */}
            <p className="text-center text-sm -mt-4 text-gray-600">
              Already have an account?{" "}
              <Link 
                href="/auth/login" 
                className="text-primary-600 font-semibold hover:text-primary-700 transition-colors"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}