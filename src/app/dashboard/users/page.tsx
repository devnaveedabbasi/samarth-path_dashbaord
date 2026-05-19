"use client";

import React, { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { Icon } from "@iconify/react";
import axiosInstance from "@/config/axiosInstance";
import { getConfig } from "@/store/slicer";
import useDebounce from "@/hooks/useDebounce";
import { DataTable, Column, PaginationInfo } from "@/components/ui/DataTable";
import SummaryCards, { SummaryCardSkeleton } from "@/components/ui/SummaryCards";
import { CustomDropdown } from "@/components/ui/Dropdown";
import { Modal } from "@/components/ui/Modal";
import Image from "next/image";
import Button from "@/components/ui/myButton";
import SearchInput from "@/components/ui/SearchInput";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Subscription {
  _id: string;
  planName?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

interface User {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  profilePicture?: string;
  status: string;
  gender?: string;
  dateOfBirth?: string;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  isSubscribed?: boolean;
  subscriptionID?: Subscription | null;
  createdAt: string;
  updatedAt?: string;
}

interface SummaryData {
  totalUsers: number;
  blockedUsers: number;
  suspendedUsers: number;
  subscribedUsers: number;
  pendingUsers: number;
  approvedUsers: number;
}

interface QueryState {
  page: number;
  limit: number;
  search: string;
  status: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS_FILTER = [
  { value: "", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "blocked", label: "Blocked" },
  { value: "suspended", label: "Suspended" },
];

const DEFAULT_QUERY: QueryState = { page: 1, limit: 10, search: "", status: "" };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusBadge(status: string) {
  const map: Record<string, string> = {
    approved: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    pending: "bg-amber-50  text-amber-700  border border-amber-200",
    blocked: "bg-red-50    text-red-700    border border-red-200",
    suspended: "bg-orange-50 text-orange-700 border border-orange-200",
  };
  return map[status] ?? "bg-gray-50 text-gray-600 border border-gray-200";
}

function statusIcon(status: string) {
  const map: Record<string, string> = {
    approved: "mdi:check-circle-outline",
    pending: "mdi:clock-outline",
    blocked: "mdi:cancel",
    suspended: "mdi:pause-circle-outline",
  };
  return map[status] ?? "mdi:help-circle-outline";
}

// ─── Shared Components ────────────────────────────────────────────────────────

const AvatarCell = React.memo(function AvatarCell({ user }: { user: User }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      {user.profilePicture ? (
        <Image
          src={user.profilePicture}
          alt={user.name}
          width={36}
          height={36}
          unoptimized
          className="object-cover rounded-full w-9 h-9 shrink-0 ring-2 ring-primary-100"
        />
      ) : (
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">
          {user.name?.charAt(0)?.toUpperCase()}
        </div>
      )}
      <div className="flex flex-col leading-tight min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate max-w-[160px]">{user.name}</p>
        <p className="text-xs text-gray-500 truncate max-w-[160px]">{user.email || user.phone || "—"}</p>
      </div>
    </div>
  );
});

const StatusBadgeCell = React.memo(function StatusBadgeCell({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${statusBadge(status)}`}>
      <Icon icon={statusIcon(status)} className="w-3.5 h-3.5" />
      {status}
    </span>
  );
});

function DetailRow({ label, value, icon }: { label: string; value: React.ReactNode; icon: string }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center shrink-0 mt-0.5">
        <Icon icon={icon} className="w-4 h-4 text-primary-600" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
        <p className="text-sm font-semibold text-gray-800 break-words">{value || "—"}</p>
      </div>
    </div>
  );
}

// ─── Action Cell (dropdown + view button) ──────────────────────────────────────

interface ActionCellProps {
  user: User;
  onStatusChange: (userId: string, status: string) => Promise<void>;
  onViewDetails: (userId: string) => void;
}

const ActionCell = React.memo(function ActionCell({ user, onStatusChange, onViewDetails }: ActionCellProps) {
  const [busy, setBusy] = useState(false);

  const handleStatus = useCallback(async (val: string | number) => {
    const newStatus = String(val);
    if (!newStatus || newStatus === user.status || busy) return;
    setBusy(true);
    try {
      await onStatusChange(user._id, newStatus);
    } finally {
      setBusy(false);
    }
  }, [user._id, user.status, busy, onStatusChange]);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onViewDetails(user._id)}
        title="View Details"
        className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 border border-transparent hover:border-primary-200 transition-all shrink-0"
      >
        <Icon icon="mdi:eye-outline" className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-1 min-w-[160px]">
        <div className="flex-1">
          <CustomDropdown
            icon={statusIcon(user.status)}
            placeholder={user.status}
            value={user.status}
            options={STATUS_OPTIONS_FILTER.filter((o) => o.value !== "")}
            onChange={handleStatus}
          />
        </div>
        {busy && <Icon icon="mdi:loading" className="w-4 h-4 animate-spin text-primary-500 shrink-0" />}
      </div>
    </div>
  );
});

// ─── User Detail Modal (fetches full data by ID) ───────────────────────────

function UserDetailModal({ userId, onClose, onStatusChange }: {
  userId: string;
  onClose: () => void;
  onStatusChange: (userId: string, status: string) => Promise<void>;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [fetching, setFetching] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFetching(true);
    setUser(null);
    axiosInstance.get(`/users/${userId}`, getConfig())
      .then((res) => { if (!cancelled && res.data.success) setUser(res.data.data as User); })
      .catch(() => { if (!cancelled) toast.error("Failed to load user details"); })
      .finally(() => { if (!cancelled) setFetching(false); });
    return () => { cancelled = true; };
  }, [userId]);

  const handleStatus = async (val: string | number) => {
    if (!user) return;
    const newStatus = String(val);
    if (newStatus === user.status || updating) return;
    setUpdating(true);
    try {
      await onStatusChange(userId, newStatus);
      setUser((prev) => prev ? { ...prev, status: newStatus } : prev);
    } finally {
      setUpdating(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Icon icon="mdi:loading" className="w-8 h-8 animate-spin text-primary-500" />
        <p className="text-sm text-gray-400">Loading user details…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Icon icon="mdi:account-alert-outline" className="w-10 h-10 text-red-400" />
        <p className="text-sm text-gray-500">Could not load user data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center gap-3 pb-4 border-b border-gray-100">
        {user.profilePicture ? (
          <Image src={user.profilePicture} alt={user.name} width={80} height={80} unoptimized
            className="w-20 h-20 rounded-full object-cover ring-4 ring-primary-100" />
        ) : (
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-3xl shadow-md">
            {user.name?.charAt(0)?.toUpperCase()}
          </div>
        )}
        <div className="text-center">
          <h3 className="text-lg font-bold text-gray-900">{user.name}</h3>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold capitalize mt-1 ${statusBadge(user.status)}`}>
            <Icon icon={statusIcon(user.status)} className="w-3.5 h-3.5" />
            {user.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
        <DetailRow label="Email" value={user.email} icon="mdi:email-outline" />
        <DetailRow label="Phone" value={user.phone} icon="mdi:phone-outline" />
        <DetailRow label="Gender" value={user.gender} icon="mdi:gender-male-female" />
        <DetailRow label="Date of Birth"
          value={user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : null}
          icon="mdi:cake-variant-outline" />
        <DetailRow label="Email Verified" value={user.isEmailVerified ? "Yes ✓" : "No"} icon="mdi:email-check-outline" />
        <DetailRow label="Phone Verified" value={user.isPhoneVerified ? "Yes ✓" : "No"} icon="mdi:phone-check-outline" />
        <DetailRow label="Subscribed" value={user.isSubscribed ? "Active" : "Not Subscribed"} icon="mdi:crown-outline" />
        <DetailRow label="Joined"
          value={new Date(user.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
          icon="mdi:calendar-outline" />
      </div>

      {user.subscriptionID && (
        <div className="bg-gradient-to-br from-primary-50 to-primary-100/50 rounded-xl p-4">
          <p className="text-xs font-bold text-primary-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Icon icon="mdi:crown" className="w-4 h-4" /> Subscription
          </p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-xs text-primary-500 mb-0.5">Plan</p><p className="font-semibold text-primary-800 capitalize">{user.subscriptionID.planName || "—"}</p></div>
            <div><p className="text-xs text-primary-500 mb-0.5">Status</p><p className="font-semibold text-primary-800 capitalize">{user.subscriptionID.status || "—"}</p></div>
            {user.subscriptionID.startDate && <div><p className="text-xs text-primary-500 mb-0.5">Start</p><p className="font-semibold text-primary-800">{new Date(user.subscriptionID.startDate).toLocaleDateString("en-GB")}</p></div>}
            {user.subscriptionID.endDate && <div><p className="text-xs text-primary-500 mb-0.5">Expires</p><p className="font-semibold text-primary-800">{new Date(user.subscriptionID.endDate).toLocaleDateString("en-GB")}</p></div>}
          </div>
        </div>
      )}

      <div className="pt-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Change Status</p>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <CustomDropdown
              icon="mdi:shield-edit-outline"
              placeholder="Select new status…"
              value={user.status}
              options={STATUS_OPTIONS_FILTER.filter((o) => o.value !== "")}
              onChange={handleStatus}
            />
          </div>
          {updating && <Icon icon="mdi:loading" className="w-5 h-5 animate-spin text-primary-500" />}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function UsersPage(): React.JSX.Element {
  const [users, setUsers] = useState<User[]>([]);
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1, totalPages: 1, totalItems: 0,
    itemsPerPage: 10, hasNextPage: false, hasPrevPage: false,
  });

  const [queryState, setQueryState] = useState<QueryState>(DEFAULT_QUERY);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 500);

  // Modals
  const [detailUserId, setDetailUserId] = useState<string | null>(null);

  useEffect(() => {
    setQueryState((prev) => ({ ...prev, search: debouncedSearch, page: 1 }));
  }, [debouncedSearch]);

  const fetchUsers = useCallback(async (showLoader = true): Promise<void> => {
    if (showLoader) setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", queryState.page.toString());
      params.append("limit", queryState.limit.toString());
      if (queryState.search) params.append("search", queryState.search);
      if (queryState.status) params.append("status", queryState.status);

      const res = await axiosInstance.get(`/users?${params.toString()}`, getConfig());
      if (res.data.success) {
        setUsers(res.data.data.users as User[]);
        setPagination(res.data.data.pagination as PaginationInfo);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to fetch users");
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [queryState]);

  const fetchStats = useCallback(async (): Promise<void> => {
    try {
      const res = await axiosInstance.get("/users/stats", getConfig());
      if (res.data.success) setSummaryData(res.data.data.cards as SummaryData);
    } catch (e) {
      console.error("Stats fetch failed", e);
    }
  }, []);

  useEffect(() => { void fetchUsers(true); }, [fetchUsers]);
  useEffect(() => { void fetchStats(); }, [fetchStats]);

  const handleStatusUpdate = useCallback(async (userId: string, status: string): Promise<void> => {
    const res = await axiosInstance.put(`/users/${userId}/status`, { status }, getConfig());
    if (!res.data.success) throw new Error(res.data.message ?? "Update failed");
    toast.success(`User ${status} successfully`);
    setUsers((prev) => prev.map((u) => u._id === userId ? { ...u, status } : u));
    void fetchStats();
  }, [fetchStats]);

  const handleClearFilters = () => {
    setSearchInput("");
    setQueryState(DEFAULT_QUERY);
  };

  const columns: Column<User>[] = [
    {
      key: "name",
      header: "User",
      cell: (user) => <AvatarCell user={user} />,
    },
    {
      key: "phone",
      header: "Phone",
      cell: (user) => (
        <span className="text-sm text-gray-600 font-medium">{user.phone || "—"}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (user) => <StatusBadgeCell status={user.status} />,
    },
    {
      key: "isSubscribed",
      header: "Plan",
      cell: (user) => (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${user.isSubscribed
          ? "bg-violet-50 text-violet-700 border border-violet-200"
          : "bg-gray-50 text-gray-500 border border-gray-200"
          }`}>
          <Icon icon={user.isSubscribed ? "mdi:crown" : "mdi:crown-outline"} className="w-3.5 h-3.5" />
          {user.isSubscribed ? "Subscribed" : "Free"}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Joined",
      cell: (user) => (
        <span className="text-sm text-gray-500 whitespace-nowrap">
          {new Date(user.createdAt).toLocaleDateString("en-GB", {
            day: "2-digit", month: "short", year: "numeric",
          })}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (user) => (
        <ActionCell
          user={user}
          onStatusChange={handleStatusUpdate}
          onViewDetails={(id) => setDetailUserId(id)}
        />
      ),
    },
  ];

  const summaryCards = [
    { label: "Total Users", value: String(summaryData?.totalUsers ?? 0), icon: "mdi:account-group-outline", color: "" },
    { label: "Subscribed", value: String(summaryData?.subscribedUsers ?? 0), icon: "mdi:crown-outline", color: "" },
    { label: "Suspended", value: String(summaryData?.suspendedUsers ?? 0), icon: "mdi:pause-circle-outline", color: "" },
    { label: "Blocked", value: String(summaryData?.blockedUsers ?? 0), icon: "mdi:cancel", color: "" },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-5 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              Users
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Manage platform users — view details, change status, or remove accounts.
            </p>
          </div>
        </div>

        {!summaryData ? (
          <SummaryCardSkeleton />
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <SummaryCards data={summaryCards} />
          </div>
        )}

        <div className="bg-white/80 backdrop-blur-xl border border-gray-100 shadow-sm rounded-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 p-3">
            <div className="lg:col-span-5 w-full">
              <SearchInput
                value={searchInput}
                onChange={setSearchInput}
                placeholder="Search by name, email or phone…"
              />
            </div>
            <div className="lg:col-span-5 w-full">
              <CustomDropdown
                icon="mdi:filter-variant"
                placeholder="All Statuses"
                options={STATUS_OPTIONS_FILTER}
                value={queryState.status}
                onChange={(value: string | number) =>
                  setQueryState((prev) => ({ ...prev, status: String(value), page: 1 }))
                }
              />
            </div>
            <div className="lg:col-span-2 w-full flex items-end">
              <Button
                onClick={handleClearFilters}
                icon="mdi:filter-remove-outline"
                title="Clear"
                variant="secondary"
              />
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
          <DataTable
            columns={columns}
            data={users}
            loading={loading}
            pagination={pagination}
            onPageChange={(page) => setQueryState((p) => ({ ...p, page }))}
            emptyTitle="No users found"
            emptyDescription="Try adjusting your search or filters."
            emptyIcon="mdi:account-search-outline"
          />
        </div>
      </div>

      <Modal
        isOpen={!!detailUserId}
        onClose={() => setDetailUserId(null)}
        title="User Details"
        maxWidth="max-w-2xl"
      >
        {detailUserId && (
          <UserDetailModal
            userId={detailUserId}
            onClose={() => setDetailUserId(null)}
            onStatusChange={handleStatusUpdate}
          />
        )}
      </Modal>
    </div>
  );
}