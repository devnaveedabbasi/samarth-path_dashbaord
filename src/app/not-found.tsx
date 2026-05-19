"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center">

        {/* 404 */}
        <h1 className="text-9xl font-bold text-primary-500 mb-4">
          404
        </h1>

        {/* Title */}
        <h2 className="text-3xl font-semibold text-gray-800 mb-3">
          Page Not Found
        </h2>

        {/* Description */}
        <p className="text-gray-500 text-base mb-8 max-w-md mx-auto">
          Oops! The page you're looking for doesn't exist or has been moved.
        </p>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">

          <button
            onClick={() => router.back()}
            className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 
                     text-gray-800 font-medium rounded-lg transition-all"
          >
            Go Back
          </button>

          <Link
            href="/"
            className="px-6 py-2.5 bg-primary-500 text-white 
                     hover:bg-primary-600 font-medium rounded-lg 
                     transition-all"
          >
            Go Home
          </Link>

        </div>
      </div>
    </div>
  );
}