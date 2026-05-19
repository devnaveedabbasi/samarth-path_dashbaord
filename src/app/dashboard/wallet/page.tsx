"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import axiosInstance from "@/config/axiosInstance";
import { getConfig } from "@/store/slicer";
import toast from "react-hot-toast";
import SummaryCards from "@/components/ui/SummaryCards";
import Loader from "@/components/ui/Loader";
import Link from "next/link";
export default function WalletPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWalletData = async () => {
      try {
        const response = await axiosInstance.get("/wallet", getConfig());
        if (response.data.success) {
          setData(response.data.data);
        }
      } catch (error: any) {
        toast.error("Failed to fetch wallet details");
      } finally {
        setLoading(false);
      }
    };
    fetchWalletData();
  }, []);

  if (loading) return <Loader loading={loading} title="Loading Wallet Details..." />;
  if (!data) return <div className="p-8 text-center text-red-500">Failed to load data</div>;

  const { wallet, breakdown, pendingWithdrawals } = data;

const statsCards = [
  {
    label: "Admin Balance",
    value: wallet?.balance || "0",
    icon: "mdi:wallet",
    color: "blue",
  },
  {
    label: "Total Withdrawals",
    value: wallet?.totalProviderWithdrawals || "0",
    icon: "mdi:bank-outline",
    color: "emerald",
  },
  {
    label: "Pending Withdrawals",
    value: pendingWithdrawals?.totalRequested || "0",
    icon: "mdi:cash-clock",
    color: "amber",
  },
  {
    label: "Net Revenue",
    value: wallet?.totalEarnings || "0",
    icon: "mdi:trending-up",
    color: "indigo",
  },
];

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Wallet Management</h1>
        <p className="text-sm text-gray-500 mt-1">Manage platform earnings and provider payouts.</p>
      </div>

      <SummaryCards data={statsCards as any} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Transactions */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
            <Link href="/dashboard/payments" className="text-sm text-blue-600 font-medium">View All</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Fee</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {breakdown.recentTransactions.map((tx: any) => (
                  <tr key={tx._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">{tx.customerId?.name}</p>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900"> {tx.totalAmount}</td>
                    <td className="px-6 py-4 text-sm text-emerald-600 font-medium">+ {tx.platformFee}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{new Date(tx.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending Withdrawals */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Pending Withdrawals</h3>
            <Link href="/dashboard/withdrawals" className="text-sm text-blue-600 font-medium">Manage</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Provider</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pendingWithdrawals?.list?.map((w: any) => (
                  <tr key={w._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">{w.providerId?.name || "Provider"}</p>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-red-600"> {w.requestedAmount}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{new Date(w.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
                {!pendingWithdrawals?.list || pendingWithdrawals?.list?.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-gray-500 text-sm italic">No pending withdrawal requests.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}


