"use client";

import { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export default function AuthLayout({ children }: Props) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-primary-50">
        <div className="w-full ">{children}</div>
    </div>
  );
}