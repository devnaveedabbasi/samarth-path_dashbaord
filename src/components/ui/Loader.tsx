"use client";

import React from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

function Loader({ loading, title }: { loading: boolean; title: string }) {
  if (!loading) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm">
      
      <div className="flex flex-col items-center justify-center">
        <DotLottieReact
          src="/loading.json"
          loop
          autoplay
          style={{ width: 100, height: 100 }}
        />

        <p className="mt-2 text-lg font-medium text-gray-800">
          {title}
        </p>
      </div>

    </div>
  );
}

export default Loader;