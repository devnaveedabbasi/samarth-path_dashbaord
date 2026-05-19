// app/verify-otp/page.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { verifyOTP, resendOTP } from "@/store/slices/auth";

export default function VerifyOTPPage() {
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
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hasAutoSubmitted = useRef(false);

  useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    e.preventDefault();
    e.returnValue = ""; 
  };

  window.addEventListener("beforeunload", handleBeforeUnload);

  return () => {
    window.removeEventListener("beforeunload", handleBeforeUnload);
  };
}, []);
  // Redirect if no email
  useEffect(() => {
    if (!email) {
      router.push("/register");
    }
  }, [email, router]);

  // Initialize or restore timer
  const initializeTimer = useCallback(() => {
    const savedTimerKey = `otp_timer_${email}`;
    const savedExpiry = localStorage.getItem(savedTimerKey);
    
    if (savedExpiry) {
      const expiryTime = parseInt(savedExpiry, 10);
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((expiryTime - now) / 1000));

      if (remaining > 0) {
        setTimeLeft(remaining);
        setCanResend(false);
      } else {
        setTimeLeft(0);
        setCanResend(true);
        localStorage.removeItem(savedTimerKey);
      }
    } else {
      // Fresh OTP request - start 60s timer
      const expiryTime = Date.now() + 60 * 1000;
      localStorage.setItem(savedTimerKey, expiryTime.toString());
      setTimeLeft(60);
      setCanResend(false);
    }
  }, [email]);

  // Initialize timer on mount and when email changes
  useEffect(() => {
    if (email) {
      initializeTimer();
    }
  }, [email, initializeTimer]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft <= 0) {
      setCanResend(true);
      const savedTimerKey = `otp_timer_${email}`;
      localStorage.removeItem(savedTimerKey);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setTimeout(() => {
      setTimeLeft((prev) => {
        const newTime = prev - 1;
        if (newTime > 0) {
          const savedTimerKey = `otp_timer_${email}`;
          const newExpiry = Date.now() + newTime * 1000;
          localStorage.setItem(savedTimerKey, newExpiry.toString());
        }
        return newTime;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [timeLeft, email]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

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

    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    const pastedArray = pastedData.split("");

    const newOtp = [...otp];
    for (let i = 0; i < Math.min(pastedArray.length, 4); i++) {
      newOtp[i] = pastedArray[i];
    }
    setOtp(newOtp);

    const nextIndex = pastedArray.length < 4 ? pastedArray.length : 3;
    inputRefs.current[nextIndex]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otp.join("").trim();

    if (otpCode.length !== 4) {
      toast.error("Please enter the 4-digit verification code");
      return;
    }

    if (isSubmitting || loading) return;

    setIsSubmitting(true);
    hasAutoSubmitted.current = true;

    const result = await dispatch(verifyOTP({ email, otp: otpCode }));

    if (verifyOTP.fulfilled.match(result)) {
      localStorage.removeItem(`otp_timer_${email}`);
      
      setTimeout(() => {
        router.push("/dashboard");
      }, 1200);
    } else {
      setIsSubmitting(false);
      hasAutoSubmitted.current = false;
      setOtp(["", "", "", ""]);
      inputRefs.current[0]?.focus();
      // Do NOT clear timer on failed verification
    }
  };

  const handleResendOTP = async () => {
    if (!canResend || isSubmitting || loading) return;

    setIsSubmitting(true); // reuse for UX consistency

    const result = await dispatch(resendOTP(email));

    if (resendOTP.fulfilled.match(result)) {
      // Reset timer properly after successful resend
      const savedTimerKey = `otp_timer_${email}`;
      const newExpiry = Date.now() + 60 * 1000;
      localStorage.setItem(savedTimerKey, newExpiry.toString());

      setTimeLeft(60);
      setCanResend(false);
      setOtp(["", "", "", ""]);
      hasAutoSubmitted.current = false;
      
      inputRefs.current[0]?.focus();
    } else {
      toast.error("Failed to resend OTP. Please try again.");
    }

    setIsSubmitting(false);
  };

  if (!email) return null;

  const formattedTime = `${Math.floor(timeLeft / 60)}:${(timeLeft % 60)
    .toString()
    .padStart(2, "0")}`;

  return (
    <div className="flex h-screen overflow-hidden bg-primary-500">
      {/* Left Panel - unchanged */}
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
              Verify Your Email
            </h1>
            <p className="text-white/80 text-[17px] leading-relaxed">
              Please check your email for the verification code to complete your registration.
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
              <Image
                src="/assets/img/logo.png"
                alt="KajNow Logo"
                width={48}
                height={48}
                className="mx-auto mb-2"
              />
              <h2 className="text-3xl font-semibold text-gray-900">Verify Your Email</h2>
              <p className="text-gray-500 mt-2 text-sm">
                We've sent a verification code to
              </p>
              <p className="text-primary-600 font-semibold text-sm mt-1 break-all">
                {email}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* OTP Inputs */}
              <div className="flex justify-center gap-3">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => { inputRefs.current[index] = el; }}
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

              {/* Timer / Resend */}
              <div className="text-center">
                {!canResend ? (
                  <p className="text-sm text-gray-500">
                    Resend code in{" "}
                    <span className="font-semibold text-primary-600">{formattedTime}</span>
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={isSubmitting || loading}
                    className="text-sm text-primary-600 hover:text-primary-700 font-semibold transition-colors disabled:opacity-50"
                  >
                    Resend Verification Code
                  </button>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || loading || otp.join("").length !== 4}
                className="w-full bg-primary-600 hover:bg-primary-700 active:bg-primary-800 
                         disabled:bg-primary-400 transition-all duration-200 text-white font-semibold 
                         py-3.5 rounded-2xl shadow-lg shadow-primary-200 hover:shadow-xl 
                         text-base disabled:cursor-not-allowed"
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
                  "Verify Email"
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