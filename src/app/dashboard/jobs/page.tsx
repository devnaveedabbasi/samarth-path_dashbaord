"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Icon } from "@iconify/react";
import axiosInstance from "@/config/axiosInstance";
import { getConfig } from "@/store/slicer";
import useDebounce from "@/hooks/useDebounce";
import { DataTable, Column, PaginationInfo } from "@/components/ui/DataTable";
import { FilterBar } from "@/components/ui/FilterBar";
import SummaryCards, { SummaryCardSkeleton } from "@/components/ui/SummaryCards";
import { CustomDropdown } from "@/components/ui/Dropdown";
// import Button from "@/components/ui/Button";
import SearchInput from "@/components/ui/SearchInput";

interface Job {
  _id: string;
  orderId: string;
  provider: {
    userId: { name: string; email: string };
  };
  customer: { name: string; email: string };
  service: { name: string };
  status: string;
  paymentStatus: string;
  amount: number;
  createdAt: string;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
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
    status: "",
  });

  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 500);

  useEffect(() => {
    setQueryState((prev) => ({ ...prev, search: debouncedSearch, page: 1 }));
  }, [debouncedSearch]);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", queryState.page.toString());
      params.append("limit", queryState.limit.toString());
      if (queryState.search) params.append("search", queryState.search);
      if (queryState.status) params.append("status", queryState.status);

      const response = await axiosInstance.get(`/jobs?${params.toString()}`, getConfig());
      if (response.data.success) {
        setJobs(response.data.data.jobs);
        setPagination(response.data.data.pagination);
      }
    } catch (error: any) {
      toast.error("Failed to fetch jobs");
    } finally {
      setLoading(false);
    }
  }, [queryState]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleClearFilters = () => {
    setSearchInput("");
    setQueryState({
      page: 1,
      limit: 10,
      search: "",
      status: "",
    });
  };
  const columns: Column<Job>[] = [
    {
      key: "orderId",
      header: "Order ID",
      cell: (job) => <span className="font-mono text-xs font-semibold text-gray-600">{job.orderId || "N/A"}</span>,
    },
    {
      key: "service",
      header: "Service",
      cell: (job) => (
        <span className="text-sm font-medium text-gray-900">{job.service?.name}</span>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      cell: (job) => (
        <div>
          <p className="text-sm font-semibold text-gray-900">{job.customer?.name}</p>
          <p className="text-xs text-gray-500">{job.customer?.email}</p>
        </div>
      ),
    },
    {
      key: "provider",
      header: "Provider",
      cell: (job) => (
        <div>
          <p className="text-sm font-semibold text-gray-900">{job.provider?.userId?.name}</p>
          <p className="text-xs text-gray-500">{job.provider?.userId?.email}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (job) => (
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${job.status === 'confirmed_by_user' ? 'bg-emerald-50 text-emerald-700' :
          job.status === 'cancelled' ? 'bg-red-50 text-red-700' :
            'bg-amber-50 text-amber-700'
          }`}>
          {job.status.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      cell: (job) => <span className="text-sm font-bold text-gray-900">BDT {job.amount}</span>,
    },
    {
      key: "actions",
      header: "Actions",
      cell: (job) => (
        <Link
          href={`/dashboard/jobs/${job._id}`}
          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all inline-block"
        >
          <Icon icon="mdi:eye-outline" className="w-5 h-5" />
        </Link>
      ),
    },
  ];

  const summaryCards = [
    { label: "Total Jobs", value: pagination.totalItems, icon: "mdi:briefcase-outline", color: "blue" },
    { label: "Active", value: jobs.filter(j => ['pending', 'accepted', 'in_progress'].includes(j.status)).length, icon: "mdi:clock-outline", color: "amber" },
    { label: "Completed", value: jobs.filter(j => j.status === 'confirmed_by_user').length, icon: "mdi:check-circle-outline", color: "emerald" },
    { label: "Cancelled", value: jobs.filter(j => j.status === 'cancelled').length, icon: "mdi:close-circle-outline", color: "red" },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Jobs Management</h1>
        <p className="text-sm text-gray-500 mt-1">Manage and track all service bookings.</p>
      </div>

      <SummaryCards data={summaryCards as any} />

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
              icon="mdi:filter-variant"
              placeholder="All Status"
              options={[
                { value: "", label: "All Status" },
                { value: "pending", label: "Pending" },
                { value: "accepted", label: "Accepted" },
                { value: "in_progress", label: "In Progress" },
                { value: "confirmed_by_user", label: "Completed" },
                { value: "cancelled", label: "Cancelled" },
              ]}
              value={queryState.status}
              onChange={(value:any) => setQueryState((prev) => ({ ...prev, status: value as string, page: 1 }))}
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


      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <DataTable
          columns={columns}
          data={jobs}
          loading={loading}
          pagination={pagination}
          onPageChange={(page) => setQueryState((p) => ({ ...p, page }))}
          emptyTitle="No jobs found"
        />
      </div>
    </div>
  );
}
