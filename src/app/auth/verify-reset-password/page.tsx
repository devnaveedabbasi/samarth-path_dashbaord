// app/verify-reset-password/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { verifyResetOTP, forgotPassword } from "@/store/slices/auth";

export default function VerifyResetPasswordPage() {
  const router = useRouter();
  // const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const { loading } = useAppSelector((state) => state.auth);
  
  const email = "admin@gmail.com";
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [timeLeft, setTimeLeft] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const hasAutoSubmitted = useRef(false);

  useEffect(() => {
    if (!email) {
      router.push("/forgot-password");
      return;
    }

    // Load timer from localStorage
    const savedTimerKey = `reset_timer_${email}`;
    const savedExpiry = localStorage.getItem(savedTimerKey);
    
    if (savedExpiry) {
      const expiryTime = parseInt(savedExpiry, 10);
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((expiryTime - now) / 1000));
      
      if (remaining > 0) {
        setTimeLeft(remaining);
        setCanResend(false);
      } else {
        setCanResend(true);
        localStorage.removeItem(savedTimerKey);
      }
    } else {
      const expiryTime = Date.now() + 60 * 1000;
      localStorage.setItem(savedTimerKey, expiryTime.toString());
      setTimeLeft(60);
      setCanResend(false);
    }
  }, [email, router]);

  useEffect(() => {
    if (timeLeft <= 0) {
      setCanResend(true);
      const savedTimerKey = `reset_timer_${email}`;
      localStorage.removeItem(savedTimerKey);
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft((prev) => {
        const newTime = prev - 1;
        const savedTimerKey = `reset_timer_${email}`;
        const newExpiry = Date.now() + newTime * 1000;
        localStorage.setItem(savedTimerKey, newExpiry.toString());
        return newTime;
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, email]);

  // Auto-submit when all 4 digits are filled
  useEffect(() => {
    const otpCode = otp.join("");
    
    if (otpCode.length === 4 && !isSubmitting && !loading && !hasAutoSubmitted.current) {
      hasAutoSubmitted.current = true;
      handleAutoSubmit(otpCode);
    }
    
    if (otpCode.length !== 4) {
      hasAutoSubmitted.current = false;
    }
  }, [otp, loading, isSubmitting]);

  const handleAutoSubmit = async (otpCode: string) => {
    setIsSubmitting(true);
    
    const result = await dispatch(verifyResetOTP({ email, otp: otpCode }));
    
    if (verifyResetOTP.fulfilled.match(result)) {
      // Clear saved timer
      const savedTimerKey = `reset_timer_${email}`;
      localStorage.removeItem(savedTimerKey);
      
      // Store verification token or flag
      sessionStorage.setItem('resetVerified', 'true');
      sessionStorage.setItem('resetEmail', email);
      
      setTimeout(() => {
        router.push(`/auth/set-new-password?email=${encodeURIComponent(email)}`);
      }, 1500);
    } else {
      setIsSubmitting(false);
      hasAutoSubmitted.current = false;
      setOtp(["", "", "", ""]);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  };

  const handleChange = (index: number, value: string) => {
    if (isSubmitting || loading) return;
    if (value && !/^\d+$/.test(value)) return;
    if (value.length > 1) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    if (isSubmitting || loading) return;
    
    const pastedData = e.clipboardData.getData("text").slice(0, 4);
    const pastedArray = pastedData.split("");
    const newOtp = [...otp];
    
    for (let i = 0; i < Math.min(pastedArray.length, 4); i++) {
      if (/^\d+$/.test(pastedArray[i])) {
        newOtp[i] = pastedArray[i];
      }
    }
    setOtp(newOtp);
    
    const lastFilledIndex = newOtp.findLastIndex((val) => val !== "");
    if (lastFilledIndex < 3) {
      inputRefs.current[lastFilledIndex + 1]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otp.join("");
    
    if (otpCode.length !== 4) {
      toast.error("Please enter the 4-digit verification code");
      return;
    }
    
    if (isSubmitting || loading) return;
    
    setIsSubmitting(true);
    hasAutoSubmitted.current = true;

    const result = await dispatch(verifyResetOTP({ email, otp: otpCode }));
    
    if (verifyResetOTP.fulfilled.match(result)) {
      const savedTimerKey = `reset_timer_${email}`;
      localStorage.removeItem(savedTimerKey);
      
      sessionStorage.setItem('resetVerified', 'true');
      sessionStorage.setItem('resetEmail', email);
      
      setTimeout(() => {
        router.push(`/auth/set-new-password?email=${encodeURIComponent(email)}`);
      }, 1500);
    } else {
      setIsSubmitting(false);
      hasAutoSubmitted.current = false;
      setOtp(["", "", "", ""]);
      inputRefs.current[0]?.focus();
    }
  };

  const handleResendOTP = async () => {
    if (!canResend || isSubmitting || loading) return;
    
    const result = await dispatch(forgotPassword(email));
    
    if (forgotPassword.fulfilled.match(result)) {
      const newExpiry = Date.now() + 60 * 1000;
      const savedTimerKey = `reset_timer_${email}`;
      localStorage.setItem(savedTimerKey, newExpiry.toString());
      setTimeLeft(60);
      setCanResend(false);
      setOtp(["", "", "", ""]);
      hasAutoSubmitted.current = false;
      setIsSubmitting(false);
      inputRefs.current[0]?.focus();
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
              Verify OTP
            </h1>
            <p className="text-white/80 text-[17px] leading-relaxed">
              Enter the verification code sent to your email to reset your password.
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
              <h2 className="text-3xl font-semibold text-gray-900">Verify OTP</h2>
              <p className="text-gray-500 mt-2 text-sm">
                We've sent a verification code to
              </p>
              <p className="text-primary-600 font-semibold text-sm mt-1">
                {email}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="flex justify-center gap-3">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      inputRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    disabled={isSubmitting || loading}
                    className="w-16 h-16 text-center text-2xl font-semibold rounded-xl border-2 
                             focus:border-primary-500 focus:ring-2 focus:ring-primary-200 
                             outline-none transition-all bg-white text-gray-900
                             border-gray-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    autoFocus={index === 0}
                  />
                ))}
              </div>

              <div className="text-center space-y-4">
                {!canResend ? (
                  <p className="text-sm text-gray-500">
                    Resend code in{" "}
                    <span className="font-semibold text-primary-600">
                      {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
                    </span>
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={isSubmitting || loading}
                    className="text-sm text-primary-600 hover:text-primary-700 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Resend Verification Code
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting || loading || otp.join("").length !== 4}
                className="w-full bg-primary-600 hover:bg-primary-700 active:bg-primary-800 
                         disabled:bg-primary-400 transition-all duration-200 text-white font-semibold 
                         py-3.5 rounded-2xl shadow-lg shadow-primary-200 hover:shadow-xl 
                         text-base mt-6 disabled:cursor-not-allowed"
              >
                {isSubmitting || loading ? (
                  <span className="flex items-center justify-center gap-3">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Verifying...
                  </span>
                ) : (
                  "Verify Code"
                )}
              </button>
            </form>

            <div className="text-center">
              <Link 
                href="/forgot-password" 
                className="text-sm text-gray-500 hover:text-primary-600 transition-colors"
              >
                ← Back to Forgot Password
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}