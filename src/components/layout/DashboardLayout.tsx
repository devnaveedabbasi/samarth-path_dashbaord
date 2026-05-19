"use client";

import { ReactNode, useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import ProtectedRoute from "../ui/ProtectedRoute";

type Props = {
  children: ReactNode;
};

export default function DashboardLayout({ children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);


  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Topbar onMenuClick={() => setSidebarOpen(true)} />

      <ProtectedRoute allowedRoles={["admin"]}>
        <main className="lg:ml-56 mt-16 ">
          {children}
        </main>
      </ProtectedRoute>
    </div>
  );
}