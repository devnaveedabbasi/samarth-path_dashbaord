"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { z } from "zod";
import InputField from "@/components/ui/InputFeild";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { resetPassword } from "@/store/slices/auth";
import toast from "react-hot-toast";

const setNewPasswordSchema = z.object({
  newPassword: z.string()
    .min(6, "Password must be at least 6 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SetNewPasswordFormData = z.infer<typeof setNewPasswordSchema>;

export default function SetNewPasswordPage() {
  const router = useRouter();
  // const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const { loading } = useAppSelector((state) => state.auth);
  
  const email = "admin@gmail.com"
    const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SetNewPasswordFormData>({
    resolver: zodResolver(setNewPasswordSchema),
  });

  const newPassword = watch("newPassword", "");

  useEffect(() => {
    // Check if user came from OTP verification
    const isVerified = sessionStorage.getItem('resetVerified');
    const storedEmail = sessionStorage.getItem('resetEmail');
    
    if (!isVerified || !storedEmail || storedEmail !== email) {
      toast.error("Please verify your OTP first");
      router.push("/forgot-password");
    }
  }, [email, router]);

  const passwordStrength = (() => {
    if (!newPassword) return { score: 0, label: "", color: "" };
    let score = 0;
    if (newPassword.length >= 8) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword)) score++;
    if (/[^A-Za-z0-9]/.test(newPassword)) score++;

    const levels = [
      { score: 1, label: "Weak", color: "bg-red-500" },
      { score: 2, label: "Fair", color: "bg-orange-500" },
      { score: 3, label: "Good", color: "bg-blue-500" },
      { score: 4, label: "Strong", color: "bg-emerald-500" },
    ];
    return levels[score - 1] ?? { score: 0, label: "", color: "" };
  })();

  const onSubmit = async (data: SetNewPasswordFormData) => {
    const result = await dispatch(resetPassword({
      email,
      newPassword: data.newPassword,
      confirmPassword: data.confirmPassword,
    }));
    
    if (resetPassword.fulfilled.match(result)) {
      // Clear session storage
      sessionStorage.removeItem('resetVerified');
      sessionStorage.removeItem('resetEmail');
      
      setTimeout(() => {
        router.push("/auth/login");
      }, 2000);
    }
  };

  if (!email) return null;

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
              Set New Password
            </h1>
            <p className="text-white/80 text-[17px] leading-relaxed">
              Create a strong and secure password for your account.
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex rounded-l-4xl bg-[#FFF6F0] items-center justify-center p-10 lg:p-20 overflow-auto">
        <div className="w-full max-w-md">
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
              <h2 className="text-3xl font-semibold text-gray-900">Create New Password</h2>
              <p className="text-gray-500 mt-2 text-sm">
                Your new password must be different from previous ones
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* New Password */}
              <div>
                <InputField
                  label="New Password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  required
                  error={errors.newPassword?.message}
                  {...register("newPassword")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-9 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </button>

                {newPassword && (
                  <div className="mt-2 px-1">
                    <div className="flex items-center gap-3 mb-1">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden flex gap-px">
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className={`flex-1 h-full transition-all duration-300 rounded-full ${
                              i <= passwordStrength.score ? passwordStrength.color : "bg-gray-200"
                            }`}
                          />
                        ))}
                      </div>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          passwordStrength.score === 1
                            ? "text-red-600 bg-red-50"
                            : passwordStrength.score === 2
                            ? "text-orange-600 bg-orange-50"
                            : passwordStrength.score === 3
                            ? "text-blue-600 bg-blue-50"
                            : passwordStrength.score === 4
                            ? "text-emerald-600 bg-emerald-50"
                            : "text-gray-500 bg-gray-100"
                        }`}
                      >
                        {passwordStrength.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Password must have at least 6 characters, 1 uppercase, 1 number, and 1 special character
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <InputField
                  label="Confirm Password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  required
                  error={errors.confirmPassword?.message}
                  {...register("confirmPassword")}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-9 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary-600 hover:bg-primary-700 active:bg-primary-800 
                         disabled:bg-primary-400 transition-all duration-200 text-white font-semibold 
                         py-3.5 rounded-2xl shadow-lg shadow-primary-200 hover:shadow-xl 
                         text-base mt-6 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-3">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Resetting Password...
                  </span>
                ) : (
                  "Reset Password"
                )}
              </button>
            </form>

            <div className="text-center">
              <Link 
                href="/auth/login" 
                className="text-sm text-gray-500 hover:text-primary-600 transition-colors"
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