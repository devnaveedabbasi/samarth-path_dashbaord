"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import toast from "react-hot-toast";
import { Icon } from "@iconify/react";
import axiosInstance from "@/config/axiosInstance";
import { getConfig } from "@/store/slicer";
import { DataTable, Column, PaginationInfo } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import Loader from "@/components/ui/Loader";
import SummaryCards from "@/components/ui/SummaryCards";
import { CustomDropdown } from "@/components/ui/Dropdown";
import * as Yup from "yup";

interface Withdrawal {
  _id: string;
  providerId: {
    userId: { 
      name: string; 
      email: string;
      phone?: string;
    };
    bankDetails?: {
      accountHolderName?: string;
      bankName?: string;
      accountNumber?: string;
      branchCode?: string;
    };
  };
  requestedAmount: number;
  payableAmount?: number;
  platformFee?: number;
  status: string;
  createdAt: string;
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    accountTitle: string;
    branchCode: string;
  };
  receiptImage?: string;
  transactionId?: string;
  adminNotes?: string;
  rejectionReason?: string;
  invoiceUrl?: string;
  processedAt?: string;
}

interface ApproveFormData {
  transactionId: string;
  receipt: FileList;
  notes: string;
}

export const approveSchema = Yup.object({
  transactionId: Yup.string()
    .required("Transaction ID is required")
    .matches(/^[0-9]+$/, "Only numbers are allowed")
    .min(6, "Transaction ID must be at least 6 digits")
    .max(30, "Transaction ID must not exceed 30 digits"),
  receipt: Yup.mixed()
    .required("Receipt is required")
    .test("fileType", "Only image or PDF files are allowed", (value) => {
      if (!value) return true;
      const file = value as FileList;
      if (!file.length) return true;
      const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
      return allowedTypes.includes(file[0]?.type);
    })
    .test("fileSize", "File size must be less than 5MB", (value) => {
      if (!value) return true;
      const file = value as FileList;
      if (!file.length) return true;
      return file[0]?.size <= 5 * 1024 * 1024;
    }),
  notes: Yup.string().optional().max(500, "Notes must not exceed 500 characters"),
});

export default function WithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1, 
    totalPages: 1, 
    totalItems: 0, 
    itemsPerPage: 10, 
    hasNextPage: false, 
    hasPrevPage: false,
  });

  const [stats, setStats] = useState({
    totalPending: 0,
    totalCompleted: 0,
    totalRejected: 0,
    totalCompletedAmount: 0,
    totalPlatformFees: 0
  });

  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
  } = useForm<ApproveFormData>({
  resolver: yupResolver(approveSchema)as any,
    defaultValues: {
      transactionId: "",
      notes: "",
    },
  });

  const fetchWithdrawals = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const statusParam = filterStatus !== "all" ? `&status=${filterStatus}` : "";
      const response = await axiosInstance.get(`/withdrawals?page=${page}&limit=10${statusParam}`, getConfig());
      if (response.data.success) {
        setWithdrawals(response.data.data.withdrawals);
        setPagination(response.data.data.pagination);

        if (response.data.data.stats) {
          setStats(response.data.data.stats);
        }
      }
    } catch (error) {
      toast.error("Failed to fetch withdrawals");
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { 
    fetchWithdrawals(); 
  }, [fetchWithdrawals]);

  const onSubmitApprove = async (data: ApproveFormData) => {
    if (!selectedWithdrawal) {
      toast.error("No withdrawal selected");
      return;
    }

    setActionLoading(true);

    try {
      const formData = new FormData();
      formData.append("transactionId", data.transactionId);
      formData.append("notes", data.notes || "");
      formData.append("receipt", data.receipt[0]);

      const response = await axiosInstance.patch(
        `/withdrawals/${selectedWithdrawal._id}/approve`,
        formData,
        {
          ...getConfig(),
          headers: {
            ...getConfig().headers,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data.success) {
        toast.success("Withdrawal approved successfully");
        setIsApproveModalOpen(false);
        reset();
        fetchWithdrawals();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to approve");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedWithdrawal) {
      toast.error("No withdrawal selected");
      return;
    }
    
    if (!rejectionReason.trim()) {
      toast.error("Reason is required");
      return;
    }
    
    setActionLoading(true);
    try {
      const response = await axiosInstance.patch(
        `/withdrawals/${selectedWithdrawal._id}/reject`, 
        { reason: rejectionReason }, 
        getConfig()
      );
      if (response.data.success) {
        toast.success("Withdrawal rejected successfully");
        setIsRejectModalOpen(false);
        setRejectionReason("");
        fetchWithdrawals();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to reject");
    } finally {
      setActionLoading(false);
    }
  };

  const getBankDetails = (withdrawal: Withdrawal) => {
    // Try to get bank details from the withdrawal object first
    if (withdrawal?.bankDetails) {
      return withdrawal.bankDetails;
    }
    // Fallback to provider's bank details
    if (withdrawal?.providerId?.bankDetails) {
      return {
        bankName: withdrawal.providerId.bankDetails.bankName || "N/A",
        accountNumber: withdrawal.providerId.bankDetails.accountNumber || "N/A",
        accountTitle: withdrawal.providerId.bankDetails.accountHolderName || "N/A",
        branchCode: withdrawal.providerId.bankDetails.branchCode || "N/A",
      };
    }
    return null;
  };

  const columns: Column<Withdrawal>[] = [
    {
      key: "provider",
      header: "Provider",
      cell: (w) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center text-primary-600 font-bold text-xs">
            {w.providerId?.userId?.name?.[0] || "?"}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{w.providerId?.userId?.name || "N/A"}</p>
            <p className="text-xs text-gray-500">{w.providerId?.userId?.email || "N/A"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "bank",
      header: "Bank Details",
      cell: (w) => {
        const bankDetails = getBankDetails(w);
        return bankDetails ? (
          <div className="text-xs space-y-0.5">
            <p className="font-bold text-gray-700">{bankDetails.bankName}</p>
            <p className="text-gray-500">{bankDetails.accountNumber}</p>
            <p className="text-gray-400 italic">{bankDetails.accountTitle}</p>
          </div>
        ) : (
          <p className="text-xs text-gray-400">No bank details</p>
        );
      },
    },
    {
      key: "amount",
      header: "Amount",
      cell: (w) => (
        <div>
          <p className="text-sm font-bold text-gray-900">₨ {w.requestedAmount.toLocaleString()}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (w) => (
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
          w.status === 'pending' ? 'bg-amber-50 text-amber-600' :
          w.status === 'completed' ? 'bg-primary-50 text-primary-600' :
          'bg-red-50 text-red-600'
        }`}>
          {w.status}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (w) => (
        <div className="flex items-center gap-2">
          {w.status === 'pending' ? (
            <>
              <button
                onClick={() => { setSelectedWithdrawal(w); setIsApproveModalOpen(true); reset(); }}
                className="p-2 text-primary-600 hover:bg-primary-50 rounded-xl transition-all"
                title="Approve & Payout"
              >
                <Icon icon="mdi:check-circle-outline" className="w-5 h-5" />
              </button>
              <button
                onClick={() => { setSelectedWithdrawal(w); setIsRejectModalOpen(true); }}
                className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-all"
                title="Reject"
              >
                <Icon icon="mdi:close-circle-outline" className="w-5 h-5" />
              </button>
            </>
          ) : (
            <button
              onClick={() => { setSelectedWithdrawal(w); setIsDetailsModalOpen(true); }}
              className="p-2 text-primary-600 hover:bg-primary-50 rounded-xl transition-all"
              title="View Details"
            >
              <Icon icon="mdi:eye-outline" className="w-5 h-5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  const summaryCards = [
    { label: "Pending Requests", value: stats.totalPending, icon: "mdi:clock-outline", color: "amber" },
    { label: "Completed Payouts", value: stats.totalCompleted, icon: "mdi:check-circle-outline", color: "primary" },
    { label: "Total Paid Out", value: `₨ ${stats.totalCompletedAmount.toLocaleString()}`, icon: "mdi:cash-multiple", color: "primary" },
    { label: "Total Rejected", value: `₨ ${stats.totalRejected.toLocaleString()}`, icon: "mdi:close-circle-outline", color: "indigo" },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 lg:p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Withdrawal Management</h1>
          <p className="text-sm text-gray-500 mt-1">Process and track provider payout requests.</p>
        </div>
        <div className="w-full md:w-64">
          <CustomDropdown
            icon="mdi:filter-variant"
            placeholder="All Status"
            options={[
              { value: "all", label: "All Status" },
              { value: "pending", label: "Pending" },
              { value: "completed", label: "Completed" },
              { value: "rejected", label: "Rejected" },
            ]}
            value={filterStatus}
            onChange={(val: any) => setFilterStatus(val as string)}
          />
        </div>
      </div>

      <SummaryCards data={summaryCards as any} />

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={withdrawals}
          loading={loading}
          pagination={pagination}
          onPageChange={fetchWithdrawals}
          emptyTitle="No withdrawal requests found"
        />
      </div>

      {/* Approve Modal */}
      <Modal isOpen={isApproveModalOpen} onClose={() => setIsApproveModalOpen(false)} title="Approve & Process Payout">
        <form onSubmit={handleSubmit(onSubmitApprove as any)} className="space-y-6">
          <div className="p-4 bg-primary-50 rounded-2xl border border-primary-100">
            <h4 className="text-xs font-bold text-primary-800 uppercase tracking-wider mb-3">Destination Bank Details</h4>
            {(() => {
              const bankDetails = getBankDetails(selectedWithdrawal!);
              return bankDetails ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-primary-600 uppercase font-bold">Bank Name</p>
                    <p className="text-sm font-semibold text-primary-900">{bankDetails.bankName}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-primary-600 uppercase font-bold">Account Number</p>
                    <p className="text-sm font-semibold text-primary-900">{bankDetails.accountNumber}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-primary-600 uppercase font-bold">Account Title</p>
                    <p className="text-sm font-semibold text-primary-900">{bankDetails.accountTitle}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-primary-600 uppercase font-bold">Requested Amount</p>
                    <p className="text-lg font-bold text-primary-700">₨ {selectedWithdrawal?.requestedAmount?.toLocaleString()}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-red-600">No bank details available</p>
              );
            })()}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Transaction ID / Reference *</label>
             <input
  type="text"
  {...register("transactionId")}
  onChange={(e) => {
    // Only allow numbers
    const numericValue = e.target.value.replace(/[^0-9]/g, '');
    e.target.value = numericValue;
    register("transactionId").onChange(e);
  }}
  className={`w-full px-4 py-3 bg-gray-50 border rounded-2xl focus:ring-2 focus:ring-primary-500 outline-none transition-all ${
    errors.transactionId ? "border-red-500" : "border-gray-200"
  }`}
  placeholder="Enter bank transaction ID..."
  inputMode="numeric"
  pattern="[0-9]*"
/>
              {errors.transactionId && (
                <p className="text-red-500 text-xs mt-1">{errors.transactionId.message}</p>
              )}
            </div>
            
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Payment Slip / Receipt *</label>
              <div className="relative group">
                <input
                  type="file"
                  {...register("receipt")}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-6 file:rounded-2xl file:border-0 file:text-xs file:font-bold file:bg-primary-600 file:text-white hover:file:bg-primary-700 transition-all cursor-pointer bg-gray-50 p-2 rounded-2xl border border-dashed border-gray-300"
                  accept="image/*,application/pdf"
                />
              </div>
              {errors.receipt && (
                <p className="text-red-500 text-xs mt-1">{errors.receipt.message}</p>
              )}
            </div>
            
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Admin Notes (Optional)</label>
              <textarea
                {...register("notes")}
                className={`w-full px-4 py-3 bg-gray-50 border rounded-2xl h-24 outline-none focus:ring-2 focus:ring-primary-500 transition-all ${
                  errors.notes ? "border-red-500" : "border-gray-200"
                }`}
                placeholder="Add any internal notes..."
              />
              {errors.notes && (
                <p className="text-red-500 text-xs mt-1">{errors.notes.message}</p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={actionLoading}
            className="w-full py-4 bg-primary-600 text-white rounded-2xl font-bold hover:bg-primary-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-200 disabled:opacity-50"
          >
            {actionLoading ? <Icon icon="mdi:loading" className="w-6 h-6 animate-spin" /> : <Icon icon="mdi:check-decagram" className="w-6 h-6" />}
            Confirm & Complete Payout
          </button>
        </form>
      </Modal>

      {/* Details Modal */}
      <Modal isOpen={isDetailsModalOpen} onClose={() => setIsDetailsModalOpen(false)} title="Withdrawal Details">
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold">Status</p>
              <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-bold uppercase ${
                selectedWithdrawal?.status === 'completed' ? 'bg-primary-100 text-primary-700' : 
                selectedWithdrawal?.status === 'rejected' ? 'bg-red-100 text-red-700' :
                'bg-amber-100 text-amber-700'
              }`}>
                {selectedWithdrawal?.status}
              </span>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase font-bold">Requested On</p>
              <p className="text-sm font-semibold text-gray-900">
                {selectedWithdrawal?.createdAt ? new Date(selectedWithdrawal.createdAt).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border border-gray-100 rounded-2xl">
                <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Requested Amount</p>
                <p className="text-lg font-bold text-gray-900">₨ {selectedWithdrawal?.requestedAmount?.toLocaleString()}</p>
              </div>
              <div className="p-4 border border-gray-100 rounded-2xl">
                <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Platform Fee</p>
                <p className="text-lg font-bold text-red-500">₨ {selectedWithdrawal?.platformFee?.toLocaleString() || 0}</p>
              </div>
            </div>

            <div className="p-4 bg-primary-50 border border-primary-100 rounded-2xl">
              <p className="text-[10px] text-primary-600 uppercase font-bold mb-1">Net Payout Amount</p>
              <p className="text-2xl font-black text-primary-700">
                ₨ {((selectedWithdrawal?.requestedAmount || 0) - (selectedWithdrawal?.platformFee || 0)).toLocaleString()}
              </p>
            </div>

            {selectedWithdrawal?.status === 'completed' && (
              <div className="space-y-3">
                <div className="p-4 border border-gray-100 rounded-2xl bg-gray-50">
                  <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Transaction ID</p>
                  <p className="text-sm font-mono font-bold text-gray-800">{selectedWithdrawal?.transactionId || 'N/A'}</p>
                </div>
                {selectedWithdrawal?.processedAt && (
                  <div className="p-4 border border-gray-100 rounded-2xl bg-gray-50">
                    <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Processed Date</p>
                    <p className="text-sm font-semibold text-gray-800">
                      {new Date(selectedWithdrawal.processedAt).toLocaleString()}
                    </p>
                  </div>
                )}
                {selectedWithdrawal?.receiptImage && (
                  <a
                    href={`${process.env.NEXT_PUBLIC_API_URL || ''}${selectedWithdrawal.receiptImage}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-4 bg-white border border-gray-200 hover:border-primary-500 rounded-2xl transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <Icon icon="mdi:file-image-outline" className="w-6 h-6 text-primary-500" />
                      <span className="text-sm font-bold text-gray-700">View Payment Receipt</span>
                    </div>
                    <Icon icon="mdi:open-in-new" className="w-5 h-5 text-gray-300 group-hover:text-primary-500" />
                  </a>
                )}
                {selectedWithdrawal?.invoiceUrl && (
                  <a
                    href={`${process.env.NEXT_PUBLIC_API_URL || ''}${selectedWithdrawal.invoiceUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-4 bg-white border border-gray-200 hover:border-primary-500 rounded-2xl transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <Icon icon="mdi:file-pdf-box" className="w-6 h-6 text-red-500" />
                      <span className="text-sm font-bold text-gray-700">View Invoice</span>
                    </div>
                    <Icon icon="mdi:open-in-new" className="w-5 h-5 text-gray-300 group-hover:text-primary-500" />
                  </a>
                )}
                {selectedWithdrawal?.adminNotes && (
                  <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl">
                    <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Admin Notes</p>
                    <p className="text-sm text-gray-700">{selectedWithdrawal.adminNotes}</p>
                  </div>
                )}
              </div>
            )}

            {selectedWithdrawal?.status === 'rejected' && (
              <div className="space-y-3">
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl">
                  <p className="text-[10px] text-red-600 uppercase font-bold mb-1">Rejection Reason</p>
                  <p className="text-sm font-medium text-red-900">{selectedWithdrawal?.rejectionReason || "No reason provided"}</p>
                </div>
                {selectedWithdrawal?.adminNotes && (
                  <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl">
                    <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Admin Notes</p>
                    <p className="text-sm text-gray-700">{selectedWithdrawal.adminNotes}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            onClick={() => setIsDetailsModalOpen(false)}
            className="w-full py-3 bg-gray-900 text-white rounded-2xl font-bold hover:bg-black transition-all"
          >
            Close
          </button>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal isOpen={isRejectModalOpen} onClose={() => setIsRejectModalOpen(false)} title="Reject Withdrawal Request">
        <div className="space-y-6">
          <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
            <p className="text-sm text-red-800 font-medium leading-relaxed">
              You are about to reject the withdrawal request for <strong>₨ {selectedWithdrawal?.requestedAmount?.toLocaleString()}</strong>.
              The full amount will be credited back to the provider's wallet balance.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Reason for Rejection *</label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl h-36 outline-none focus:ring-2 focus:ring-red-500 transition-all"
              placeholder="Please provide a clear reason for the provider..."
              required
            />
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setIsRejectModalOpen(false)}
              className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-2xl font-bold hover:bg-gray-200 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleReject}
              disabled={actionLoading}
              className="flex-[2] py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-200 disabled:opacity-50"
            >
              {actionLoading ? <Icon icon="mdi:loading" className="w-6 h-6 animate-spin" /> : "Confirm Rejection"}
            </button>
          </div>
        </div>
      </Modal>

      {loading && <Loader loading={loading} title="Syncing Withdrawal Requests..." />}
    </div>
  );
}