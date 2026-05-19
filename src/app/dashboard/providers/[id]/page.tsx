"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Icon } from "@iconify/react";
import axiosInstance from "@/config/axiosInstance";
import { baseUrlImg, getConfig } from "@/store/slicer";
import { Modal } from "@/components/ui/Modal";
import { DataTable, Column } from "@/components/ui/DataTable";
import Image from "next/image";

export default function ProviderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const providerId = params.id as string;

  const [provider, setProvider] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "reject" | "suspend">("approve");
  const [reason, setReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const fetchProviderDetails = useCallback(async () => {
    try {
      const response = await axiosInstance.get(`/providers/${providerId}`, getConfig());
      if (response.data.success) {
        setProvider(response.data.data);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to fetch provider details");
      router.push("/dashboard/providers");
    } finally {
      setLoading(false);
    }
  }, [providerId, router]);

  useEffect(() => {
    if (providerId) {
      fetchProviderDetails();
    }
  }, [providerId, fetchProviderDetails]);

  const handleKycAction = async () => {
    setActionLoading(true);
    try {
      let url = `/providers/${providerId}/kyc/${actionType}`;
      let data = actionType !== "approve" ? { reason } : undefined;

      const response = await axiosInstance.put(url, data, getConfig());
      if (response.data.success) {
        toast.success(`KYC ${actionType}d successfully`);
        setIsActionModalOpen(false);
        setReason("");
        fetchProviderDetails();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || `Failed to ${actionType} KYC`);
    } finally {
      setActionLoading(false);
    }
  };

  const openActionModal = (type: "approve" | "reject" | "suspend") => {
    setActionType(type);
    setIsActionModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <Icon icon="mdi:loading" className="w-10 h-10 text-primary-600 animate-spin" />
      </div>
    );
  }

  if (!provider) return null;

  const user = provider.userId;
  const stats = provider.serviceStats || {};
  const jobs = provider.jobs || [];
  const services = provider.approvedServices || [];

  const jobColumns: Column<any>[] = [
    {
      key: "service",
      header: "Service",
      cell: (job) => <span className="font-medium text-gray-900">{job.service?.name || "N/A"}</span>,
    },
    {
      key: "customer",
      header: "Customer",
      cell: (job) => (
        <div>
          <p className="text-sm font-semibold text-gray-900">{job.customer?.name || "N/A"}</p>
          <p className="text-xs text-gray-500">{job.customer?.email}</p>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      cell: (job) => <span className="font-semibold text-gray-900">${job.amount}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (job) => (
        <span className="capitalize px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
          {job.status.replace(/_/g, " ")}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Date",
      cell: (job) => (
        <span className="text-sm text-gray-600">
          {new Date(job.createdAt).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/dashboard/providers")}
            className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <Icon icon="mdi:arrow-left" className="w-6 h-6 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              Provider Details
            </h1>
            <p className="text-sm text-gray-500 mt-1">Comprehensive view of provider information, jobs, and KYC.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Profile & Stats */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex flex-col items-center text-center">
                {user.profilePicture ? (
                  <img
                    src={`${baseUrlImg}${user.profilePicture}`}
                    alt={user.name}
                    className="w-24 h-24 rounded-full object-cover shadow-md"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center font-bold text-3xl shadow-md">
                    {user.name?.charAt(0) || "P"}
                  </div>
                )}
                <h2 className="mt-4 text-xl font-bold text-gray-900">{user.name}</h2>
                <p className="text-gray-500 text-sm">{user.email}</p>
                {user.phoneNumber && <p className="text-gray-500 text-sm mt-1">{user.phoneNumber}</p>}
                
                <div className="mt-4 flex gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                    provider.kycStatus === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                    provider.kycStatus === 'rejected' ? 'bg-red-100 text-red-700' :
                    provider.kycStatus === 'suspended' ? 'bg-purple-100 text-purple-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    KYC {provider.kycStatus}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    user.isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {provider.userId?.status}
                  </span>
                </div>
              </div>

              <hr className="my-6 border-gray-100" />

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Joined Date</span>
                  <span className="text-gray-900 font-medium">
                    {new Date(provider.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Category</span>
                  <span className="text-gray-900 font-medium">{provider.Category?.name || "N/A"}</span>
                </div>
              </div>
            </div>

            {/* Service Requests Stats */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Service Requests</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-500">Total</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {(stats.pending || 0) + (stats.approved || 0) + (stats.rejected || 0)}
                  </p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4">
                  <p className="text-sm text-emerald-600">Approved</p>
                  <p className="text-2xl font-bold text-emerald-700">{stats.approved || 0}</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-4">
                  <p className="text-sm text-amber-600">Pending</p>
                  <p className="text-2xl font-bold text-amber-700">{stats.pending || 0}</p>
                </div>
                <div className="bg-red-50 rounded-xl p-4">
                  <p className="text-sm text-red-600">Rejected</p>
                  <p className="text-2xl font-bold text-red-700">{stats.rejected || 0}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: KYC, Services, Jobs */}
          <div className="lg:col-span-2 space-y-6">
            {/* KYC Section */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">KYC Information</h3>
                <div className="flex gap-2">
                  {provider.kycStatus === "pending" && (
                    <>
                      <button
                        onClick={() => openActionModal("approve")}
                        className="px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg font-semibold text-sm transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => openActionModal("reject")}
                        className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg font-semibold text-sm transition-colors"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {provider.kycStatus === "approved" && (
                    <button
                      onClick={() => openActionModal("suspend")}
                      className="px-4 py-2 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-lg font-semibold text-sm transition-colors"
                    >
                      Suspend
                    </button>
                  )}
                  {provider.kycStatus === "suspended" && (
                    <button
                      onClick={() => openActionModal("approve")}
                      className="px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg font-semibold text-sm transition-colors"
                    >
                      Re-Approve
                    </button>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[{ label: "Face Photo", url: provider.facePhoto }, { label: "ID Front", url: provider.idCardFront }, { label: "ID Back", url: provider.idCardBack }].map((doc, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-xl overflow-hidden group relative cursor-pointer" onClick={() => doc.url && setImagePreview(doc.url)}>
                    {console.log(doc.url,'users')}
                    <div className="h-32 bg-gray-100 flex items-center justify-center">
                      {doc.url ? (
                         <img src={`${process.env.NEXT_PUBLIC_API_URL}${doc.url}`} alt={doc.label} className="w-full h-full object-cover" />
                      ) : (
                        <Icon icon="mdi:image-off-outline" className="text-gray-400 w-8 h-8" />
                      )}
                    </div>
                    <div className="bg-gray-50 p-2 text-center text-sm font-medium text-gray-700 border-t border-gray-200">
                      {doc.label}
                    </div>
                    {doc.url && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Icon icon="mdi:eye" className="text-white w-8 h-8" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Services Section */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Offered Services</h3>
              {services.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {services?.map((item: any) => (
                    <div key={item.serviceId?._id} className="flex items-start gap-4 p-4 border border-gray-100 rounded-xl">
                      <div className="w-12 h-12 bg-primary-50 rounded-lg flex items-center justify-center text-primary-600 shrink-0">
                         {item?.icon ? <Image width={300} height={350} unoptimized src={`${baseUrlImg}${item?.icon}`} alt="icon" className="w-8 h-8 object-contain" /> : <Icon icon="mdi:tools" className="w-6 h-6" />}
                      </div>
                      <div>
                        <p className="font-semibold capitalize text-gray-900">{item?.name}</p>
                        <p className="text-sm text-gray-500 font-semibold">${item?.price}</p>
                        <p className="text-xs text-gray-500">{item?.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No services approved for this provider yet.</p>
              )}
            </div>

            {/* Jobs Section */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Recent Jobs</h3>
              <div className="overflow-x-auto">
                <DataTable
                  columns={jobColumns}
                  data={jobs}
                  loading={false}
                  emptyTitle="No jobs found"
                  emptyDescription="This provider hasn't received any jobs yet."
                  emptyIcon="mdi:briefcase-outline"
                />
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Action Modal */}
      <Modal
        isOpen={isActionModalOpen}
        onClose={() => setIsActionModalOpen(false)}
        title={`${actionType.charAt(0).toUpperCase() + actionType.slice(1)} KYC`}
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to {actionType} the KYC for <strong>{user?.name}</strong>?
          </p>

          {actionType !== "approve" && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Reason
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={`Please provide a reason for ${actionType}ing the KYC`}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all bg-gray-50/50 focus:bg-white min-h-[100px]"
              />
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              onClick={() => setIsActionModalOpen(false)}
              className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleKycAction}
              disabled={actionLoading || (actionType !== "approve" && !reason.trim())}
              className={`flex-1 px-4 py-2.5 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 ${actionType === "approve"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : actionType === "reject"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-purple-600 hover:bg-purple-700"
                }`}
            >
              {actionLoading ? (
                <Icon icon="mdi:loading" className="w-5 h-5 animate-spin" />
              ) : (
                actionType.charAt(0).toUpperCase() + actionType.slice(1)
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Image Preview Modal */}
      <Modal isOpen={!!imagePreview} onClose={() => setImagePreview(null)} title="Document Preview">
        <div className="flex justify-center -mt-5 ">
          {imagePreview && <Image src={`${process.env.NEXT_PUBLIC_API_URL}${imagePreview}`} width={400} height={400} unoptimized alt="Preview" className="max-w-full max-h-[50vh] rounded-lg shadow-sm" />}
        </div>
      </Modal>

    </div>
  );
}
