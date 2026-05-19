"use client";

import React, { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { Icon } from "@iconify/react";
import { useRouter } from "next/navigation";
import axiosInstance from "@/config/axiosInstance";
import { baseUrlImg, getConfig } from "@/store/slicer";
import useDebounce from "@/hooks/useDebounce";
import { DataTable, Column, PaginationInfo } from "@/components/ui/DataTable";
import { FilterBar } from "@/components/ui/FilterBar";
import SummaryCards, { SummaryCardSkeleton } from "@/components/ui/SummaryCards";
import { CustomDropdown } from "@/components/ui/Dropdown";
import { Modal } from "@/components/ui/Modal";
// import Button from "@/components/ui/Button";
import SearchInput from "@/components/ui/SearchInput";
import Image from "next/image";

interface Provider {
  _id: string;
  user: {
    name: string;
    email: string;
    phone: string;
    profilePicture: string;
    isActive: boolean;
  };
  kycStatus: string;
  isKycCompleted: boolean;
  createdAt: string;
}

interface SummaryData {
approvedKyc: number;
pendingKyc: number;
rejectedKyc: number;
    totalProviders: number;
}

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
    hasNextPage: false,
    hasPrevPage: false,
  });

  const [queryState, setQueryState] = useState({
    page: 1,
    limit: 10,
    search: "",
    kycStatus: "",
  });

  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 500);

  // Modals
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | "suspend">("approve");
  const [reason, setReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    setQueryState((prev) => ({ ...prev, search: debouncedSearch, page: 1 }));
  }, [debouncedSearch]);

  const fetchProviders = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", queryState.page.toString());
      params.append("limit", queryState.limit.toString());
      if (queryState.search) params.append("search", queryState.search);
      if (queryState.kycStatus) params.append("kycStatus", queryState.kycStatus);

      const response = await axiosInstance.get(`/providers?${params.toString()}`, getConfig());
      if (response.data.success) {
        setProviders(response.data.data.providers);
        setPagination(response.data.data.pagination);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to fetch providers");
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [queryState]);

  const fetchStats = async () => {
    try {
      const response = await axiosInstance.get("/providers/stats", getConfig());
      if (response.data.success) {
        setSummaryData(response.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch stats", error);
    }
  };

  useEffect(() => {
    fetchProviders(true);
  }, [fetchProviders]);

  useEffect(() => {
    fetchStats();
  }, []);

  const handleKycAction = async () => {
    if (!selectedProvider) return;
    setActionLoading(true);
    try {
      let url = `/providers/${selectedProvider._id}/kyc/${actionType}`;
      let data = actionType !== "approve" ? { reason } : undefined;

      const response = await axiosInstance.put(url, data, getConfig());
      if (response.data.success) {
        toast.success(`KYC ${actionType}d successfully`);
        setIsActionModalOpen(false);
        setReason("");
        setSelectedProvider(null);
        fetchProviders(false);
        fetchStats();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || `Failed to ${actionType} KYC`);
    } finally {
      setActionLoading(false);
    }
  };

  const openActionModal = (provider: Provider, type: "approve" | "reject" | "suspend") => {
    setSelectedProvider(provider);
    setActionType(type);
    setIsActionModalOpen(true);
  };

  const columns: Column<Provider>[] = [
    {
      key: "user",
      header: "Provider",
      cell: (provider) => (
        <div className="flex items-center gap-3">
          {provider.user.profilePicture ? (
            <Image
              src={`${baseUrlImg}${provider.user.profilePicture}` }
              alt={provider.user.name}
               width={40}
              height={40}
              unoptimized
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center font-bold">
              {provider.user.name?.charAt(0) || "P"}
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-gray-900">{provider.user.name}</p>
            <p className="text-xs text-gray-500">{provider.user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "kycStatus",
      header: "KYC Status",
      cell: (provider) => {
        let badgeClass = "bg-gray-100 text-gray-700";
        if (provider.kycStatus === "approved") badgeClass = "bg-emerald-100 text-emerald-700";
        if (provider.kycStatus === "rejected") badgeClass = "bg-red-100 text-red-700";
        if (provider.kycStatus === "pending") badgeClass = "bg-amber-100 text-amber-700";
        if (provider.kycStatus === "suspended") badgeClass = "bg-purple-100 text-purple-700";

        return (
          <span className={`capitalize px-2.5 py-1 rounded-md text-xs font-medium ${badgeClass}`}>
            {provider.kycStatus}
          </span>
        );
      },
    },
    {
      key: "createdAt",
      header: "Joined",
      cell: (provider) => (
        <span className="text-sm text-gray-600 font-medium">
          {new Date(provider.createdAt).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (provider) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(`/dashboard/providers/${provider._id}`)}
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
            title="View Details"
          >
            <Icon icon="mdi:eye-outline" className="w-5 h-5" />
          </button>

          {provider.kycStatus === "pending" && (
            <>
              <button
                onClick={() => openActionModal(provider, "approve")}
                className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                title="Approve KYC"
              >
                <Icon icon="mdi:check-circle-outline" className="w-5 h-5" />
              </button>
              <button
                onClick={() => openActionModal(provider, "reject")}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                title="Reject KYC"
              >
                <Icon icon="mdi:close-circle-outline" className="w-5 h-5" />
              </button>
            </>
          )}

          {provider.kycStatus === "approved" && (
            <button
              onClick={() => openActionModal(provider, "suspend")}
              className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all"
              title="Suspend KYC"
            >
              <Icon icon="mdi:pause-circle-outline" className="w-5 h-5" />
            </button>
          )}

          {provider.kycStatus === "suspended" && (
            <button
              onClick={() => openActionModal(provider, "approve")}
              className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
              title="Re-Approve KYC"
            >
              <Icon icon="mdi:play-circle-outline" className="w-5 h-5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  {console.log("Summary Data:", summaryData)} {/* Debugging log */}
  const summaryCards = [
    {
      label: "Total Providers",
      value: summaryData?.totalProviders || 0,
      icon: "mdi:account-hard-hat",
    },
    {
      label: "Pending KYC",
      value: summaryData?.pendingKyc || 0,
      icon: "mdi:clock-outline",
    },
    {
      label: "Approved KYC",
      value: summaryData?.approvedKyc || 0,
      icon: "mdi:check-decagram",
    },
      {
      label: "Rejected KYC",
      value: summaryData?.rejectedKyc || 0,
    icon: "mdi:close-circle-outline",
    },
  ];

  const handleClearFilters = () => {
    setSearchInput("");
    setQueryState({
      page: 1,
      limit: 10,
      search: "",
      kycStatus: "",
    });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              Providers
            </h1>
            <p className="text-sm text-gray-500 mt-1">Manage service providers and their KYC status.</p>
          </div>
        </div>

        <div>
          {!summaryData ? (
            <SummaryCardSkeleton />
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <SummaryCards data={summaryCards as any} />
            </div>
          )}
        </div>

        <div className="bg-white/80 backdrop-blur-xl border z-50 border-gray-100 shadow-sm rounded-2xl ">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 p-3">
            <div className="lg:col-span-8 w-full">
              <SearchInput
                value={searchInput}
                onChange={setSearchInput}
                placeholder="Search categories by name..."
              />
            </div>
            <div className="lg:col-span-3 w-full">
              <CustomDropdown
                icon="mdi:card-account-details-outline"
                placeholder="All KYC Status"
                options={[
                  { value: "", label: "All Status" },
                  { value: "pending", label: "Pending" },
                  { value: "approved", label: "Approved" },
                  { value: "rejected", label: "Rejected" },
                  { value: "suspended", label: "Suspended" },
                ]}
                value={queryState.kycStatus}
                onChange={(value:any) => setQueryState((prev) => ({ ...prev, kycStatus: value as string, page: 1 }))}
              />
            </div>

            <div className="lg:col-span-1 w-full flex items-end">
              {/* <Button
                onClick={handleClearFilters}
                icon="mdi:filter-remove-outline"
                title="Clear Filters"
                variant="secondary"
              /> */}
            </div>
          </div>
        </div>




        <div className="bg-white/80 backdrop-blur-xl border border-gray-100 shadow-sm rounded-2xl">
          <DataTable
            columns={columns}
            data={providers}
            loading={loading}
            pagination={pagination}
            onPageChange={(page) => setQueryState((p) => ({ ...p, page }))}
            emptyTitle="No providers found"
            emptyDescription="Try adjusting your search or filters."
            emptyIcon="mdi:account-search-outline"
          />
        </div>
      </div>

      <Modal
        isOpen={isActionModalOpen}
        onClose={() => setIsActionModalOpen(false)}
        title={`${actionType.charAt(0).toUpperCase() + actionType.slice(1)} KYC`}
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to {actionType} the KYC for <strong>{selectedProvider?.user.name}</strong>?
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
    </div>
  );
}
