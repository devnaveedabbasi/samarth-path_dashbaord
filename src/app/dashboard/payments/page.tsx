"use client";

import React, { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { Icon } from "@iconify/react";
import axiosInstance from "@/config/axiosInstance";
import { getConfig } from "@/store/slicer";
import { DataTable, Column, PaginationInfo } from "@/components/ui/DataTable";
import { FilterBar } from "@/components/ui/FilterBar";

interface Payment {
  _id: string;
  totalAmount: number;
  platformFee: number;
  paymentStatus: string;
  paymentMethod: string;
  customerId: { name: string; email: string };
  providerId: { name: string; email: string };
  jobId: { orderId: string };
  createdAt: string;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 10, hasNextPage: false, hasPrevPage: false,
  });

  const [queryState, setQueryState] = useState({ page: 1, limit: 10 });

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get(`/wallet/transactions?page=${queryState.page}&limit=${queryState.limit}`, getConfig());
      if (response.data.success) {
        setPayments(response.data.data.transactions);
        setPagination(response.data.data.pagination);
      }
    } catch (error) {
      toast.error("Failed to fetch payments");
    } finally {
      setLoading(false);
    }
  }, [queryState]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const columns: Column<Payment>[] = [
    {
      key: "jobId",
      header: "Order ID",
      cell: (p) => <span className="font-mono text-xs font-semibold text-gray-600">{p.jobId?.orderId || "N/A"}</span>,
    },
    {
      key: "customer",
      header: "Customer",
      cell: (p) => (
        <div>
          <p className="text-sm font-semibold text-gray-900">{p.customerId?.name}</p>
          <p className="text-xs text-gray-500">{p.customerId?.email}</p>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Total / Fee",
      cell: (p) => (
        <div>
          <p className="text-sm font-bold text-gray-900">BDT {p.totalAmount}</p>
          <p className="text-[10px] text-emerald-600 font-bold">Fee: BDT {p.platformFee}</p>
        </div>
      ),
    },
    {
      key: "method",
      header: "Method",
      cell: (p) => <span className="text-xs font-medium text-gray-600 capitalize">{p.paymentMethod || "SSLCommerz"}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (p) => (
        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
          p.paymentStatus === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
        }`}>
          {p.paymentStatus}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Date",
      cell: (p) => <span className="text-xs text-gray-500">{new Date(p.createdAt).toLocaleDateString()}</span>,
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payment Tracking</h1>
          <p className="text-sm text-gray-500 mt-1">Monitor all platform financial transactions.</p>
        </div>
        
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <DataTable
          columns={columns}
          data={payments}
          loading={loading}
          pagination={pagination}
          onPageChange={(page) => setQueryState(p => ({ ...p, page }))}
          emptyTitle="No payments found"
        />
      </div>
    </div>
  );
}
