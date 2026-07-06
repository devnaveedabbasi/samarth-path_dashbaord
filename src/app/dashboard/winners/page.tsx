"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import axiosInstance from "@/config/axiosInstance";
import Button from "@/components/ui/Button";
import SearchInput from "@/components/ui/SearchInput";
import { CustomDropdown } from "@/components/ui/Dropdown";
import { DataTable } from "@/components/ui/DataTable";
import SummaryCards from "@/components/ui/SummaryCards";
import { SummaryCardSkeleton } from "@/components/ui/SummaryCards";
import { Modal } from "@/components/ui/Modal";
import toast from "react-hot-toast";

// Types
interface WinnerStats {
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  totalTime: number;
  firstAttemptAt?: string;
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  email: string;
  profilePicture: string | null;
  stats: WinnerStats;
}

interface CorrectAttempt {
  _id?: string; // For DataTable compatibility
  attemptId: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  quizId: string;
  selectedOption: string;
  isCorrect: boolean;
  timeTaken: number;
  attemptedAt: string;
}

interface SelectedWinner {
  id?: string;
  userId: string;
  name: string;
  email: string;
  profilePicture: string | null;
  stats: WinnerStats;
  selectedAt?: string;
  weekNumber?: number;
  year?: number;
  weekRange?: {
    start: string;
    end: string;
  };
}

interface WinnerData {
  winner: LeaderboardEntry | null;
  leaderboard: LeaderboardEntry[];
  correctAttempts: CorrectAttempt[];
  totalUsers?: number;
  week?: {
    start: string;
    end: string;
    weekNumber: number;
    year: number;
  };
}

interface Prize {
  _id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  prizeType: "daily" | "weekly";
}

interface PrizeForm {
  title: string;
  description: string;
  imageFile: File | null;
  imagePreview: string;
}

const emptyPrizeForm: PrizeForm = {
  title: "",
  description: "",
  imageFile: null,
  imagePreview: "",
};

export default function WinnersManagement() {
  const [activeTab, setActiveTab] = useState<"daily" | "weekly">("daily");
  const [loading, setLoading] = useState(true);
  const [selectingWinner, setSelectingWinner] = useState(false);
  const [data, setData] = useState<WinnerData>({
    winner: null,
    leaderboard: [],
    correctAttempts: [],
    totalUsers: 0,
  });
  const [selectedWinner, setSelectedWinner] = useState<SelectedWinner | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRank, setFilterRank] = useState<number | "all">("all");
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Prize state
  const [prize, setPrize] = useState<Prize | null>(null);
  const [prizeLoading, setPrizeLoading] = useState(false);
  const [prizeSaving, setPrizeSaving] = useState(false);
  const [showPrizeModal, setShowPrizeModal] = useState(false);
  const [prizeForm, setPrizeForm] = useState<PrizeForm>(emptyPrizeForm);

  // Fetch data based on active tab
  const fetchData = async () => {
    setLoading(true);
    try {
      const endpoint =
        activeTab === "daily"
          ? "/winners/attempters/daily"
          : "/winners/attempters/weekly";

      const response = await axiosInstance.get(endpoint);
      const result = response.data;

      if (result.success) {
        setData(result.data);
        if (result.data.winner) {
          setSelectedWinner({
            userId: result.data.winner.userId,
            name: result.data.winner.name,
            email: result.data.winner.email,
            profilePicture: result.data.winner.profilePicture,
            stats: result.data.winner.stats,
          });
        } else {
          setSelectedWinner(null);
        }
      }
    } catch (error) {
      console.error("Error fetching winners data:", error);
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  // Fetch the prize (if any) assigned to the current daily/weekly winner
  const fetchPrize = async () => {
    if (!selectedWinner) {
      setPrize(null);
      return;
    }
    setPrizeLoading(true);
    try {
      const response = await axiosInstance.get(`/winners/${activeTab}/prize`);
      const result = response.data;
      if (result.success) {
        setPrize(result.data.prize || null);
      }
    } catch (error) {
      // No winner selected yet for this cycle — not an error state, just no prize to show
      setPrize(null);
    } finally {
      setPrizeLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  useEffect(() => {
    fetchPrize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWinner, activeTab]);

  const openAssignPrizeModal = () => {
    setPrizeForm(
      prize
        ? {
            title: prize.title,
            description: prize.description || "",
            imageFile: null,
            imagePreview: "",
          }
        : emptyPrizeForm
    );
    setShowPrizeModal(true);
  };

  const handlePrizeImageChange = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are allowed");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setPrizeForm((p) => ({
      ...p,
      imageFile: file,
      imagePreview: URL.createObjectURL(file),
    }));
  };

  const handleSavePrize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prizeForm.title.trim()) {
      toast.error("Prize title is required");
      return;
    }

    setPrizeSaving(true);
    try {
      const formData = new FormData();
      formData.append("title", prizeForm.title.trim());
      formData.append("description", prizeForm.description.trim());
      if (prizeForm.imageFile) formData.append("image", prizeForm.imageFile);

      const config = { headers: { "Content-Type": "multipart/form-data" } };

      const response = prize
        ? await axiosInstance.put(`/winners/prize/${prize._id}`, formData, config)
        : await axiosInstance.post(`/winners/${activeTab}/prize`, formData, config);

      const result = response.data;
      if (result.success) {
        toast.success(
          prize ? "Prize updated successfully!" : "Prize assigned successfully!"
        );
        setPrize(result.data.prize);
        setShowPrizeModal(false);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to save prize");
    } finally {
      setPrizeSaving(false);
    }
  };

  // Select winner
  const handleSelectWinner = async (userId: string) => {
    setSelectingWinner(true);
    try {
      const endpoint =
        activeTab === "daily"
          ? `/winners/select/daily/${userId}`
          : `/winners/select/weekly/${userId}`;

      const response = await axiosInstance.post(endpoint);
      const result = response.data;

      if (result.success) {
        toast.success(
          `${activeTab === "daily" ? "Daily" : "Weekly"} winner selected successfully!`
        );
        setSelectedWinner(result.data.winner);
        setShowWinnerModal(false);
        await fetchData();
      }
    } catch (error: any) {
      console.error("Error selecting winner:", error);
      toast.error(error.response?.data?.message || "Failed to select winner");
    } finally {
      setSelectingWinner(false);
    }
  };

  // Filter leaderboard data
  const filteredLeaderboard = data.leaderboard?.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRank =
      filterRank === "all" || item.rank === filterRank;
    return matchesSearch && matchesRank;
  });

  // Summary cards data
  const summaryData = [
    {
      label: "Total Participants",
      value: data.totalUsers?.toString() || "0",
      icon: "mdi:account-group",
      color: "primary",
    },
    {
      label: "Total Correct Attempts",
      value: data.correctAttempts?.length.toString() || "0",
      icon: "mdi:check-circle",
      color: "green",
    },
    {
      label: "Top Scorer",
      value: data.winner?.name || "N/A",
      icon: "mdi:trophy",
      color: "gold",
    },
    {
      label: "Average Accuracy",
      value: data.leaderboard?.length
        ? `${Math.round(
          data.leaderboard.reduce((acc, curr) => acc + curr.stats.accuracy, 0) /
          data.leaderboard.length
        )}%`
        : "0%",
      icon: "mdi:chart-line",
      color: "blue",
    },
  ];

  // Leaderboard columns with Select Winner action
  const leaderboardColumns = [
    {
      key: "rank",
      header: "Rank",
      cell: (item: LeaderboardEntry) => (
        <div className="flex items-center gap-2">
          {item.rank === 1 ? (
            <Icon icon="mdi:crown" className="w-5 h-5 text-yellow-500" />
          ) : item.rank === 2 ? (
            <Icon icon="mdi:medal" className="w-5 h-5 text-gray-400" />
          ) : item.rank === 3 ? (
            <Icon icon="mdi:medal" className="w-5 h-5 text-amber-600" />
          ) : (
            <span className="text-sm font-semibold text-gray-500">
              #{item.rank}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "user",
      header: "User",
      cell: (item: LeaderboardEntry) => (
        <div className="flex items-center gap-3">
          {item.profilePicture ? (
            <img
              src={item.profilePicture}
              alt={item.name}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
              <span className="text-primary-600 font-semibold text-sm">
                {item.name?.charAt(0)?.toUpperCase() || "U"}
              </span>
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-gray-900">{item.name}</p>
            <p className="text-xs text-gray-500">{item.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "correctAnswers",
      header: "Correct",
      cell: (item: LeaderboardEntry) => (
        <span className="text-sm font-semibold text-green-600">
          {item.stats.correctAnswers}/{item.stats.totalQuestions}
        </span>
      ),
    },
    {
      key: "accuracy",
      header: "Accuracy",
      cell: (item: LeaderboardEntry) => (
        <div className="flex items-center gap-2">
          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-600 rounded-full transition-all"
              style={{ width: `${item.stats.accuracy.toFixed(2)}%` }}
            />
          </div>
          <span className="text-sm font-medium">
            {item.stats.accuracy.toFixed(2)}%
          </span>
        </div>
      ),
    },
    {
      key: "time",
      header: "Time",
      cell: (item: LeaderboardEntry) => (
        <span className="text-sm text-gray-600">
          {item.stats.totalTime}s
        </span>
      ),
    },
    {
      key: "action",
      header: "Action",
      cell: (item: LeaderboardEntry) => {
        const isAlreadyWinner = selectedWinner?.userId === item.userId;
        const isDisabled = !!selectedWinner || isAlreadyWinner;

        return (
          <Button
            variant={isAlreadyWinner ? "secondary" : "primary"}
            className="w-auto! px-3 py-1.5 text-xs"
            disabled={isDisabled}
            onClick={() => {
              setSelectedUserId(item.userId);
              setShowWinnerModal(true);
            }}
          >
            {isAlreadyWinner ? (
              <span className="flex items-center gap-1">
                <Icon icon="mdi:check-circle" className="w-3.5 h-3.5" />
                Selected
              </span>
            ) : isDisabled ? (
              <span className="flex items-center gap-1">
                <Icon icon="mdi:lock" className="w-3.5 h-3.5" />
                Locked
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Icon icon="mdi:crown" className="w-3.5 h-3.5" />
                Select Winner
              </span>
            )}
          </Button>
        );
      },
    },
  ];

  // Correct attempts columns
  const attemptsColumns = [
    {
      key: "user",
      header: "User",
      cell: (item: CorrectAttempt) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
            <span className="text-primary-600 font-semibold text-sm">
              {item.user.name?.charAt(0)?.toUpperCase() || "U"}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{item.user.name}</p>
            <p className="text-xs text-gray-500">{item.user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "timeTaken",
      header: "Time Taken",
      cell: (item: CorrectAttempt) => (
        <span className="text-sm text-gray-600">{item.timeTaken}s</span>
      ),
    },
    {
      key: "attemptedAt",
      header: "Attempted At",
      cell: (item: CorrectAttempt) => (
        <span className="text-sm text-gray-600">
          {new Date(item.attemptedAt).toLocaleString()}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (item: CorrectAttempt) => (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
          <Icon icon="mdi:check-circle" className="w-3.5 h-3.5" />
          Correct
        </span>
      ),
    },
  ];

  // Rank filter options
  const rankOptions = [
    { label: "All Ranks", value: "all" },
    ...Array.from({ length: data.leaderboard?.length || 0 }, (_, i) => ({
      label: `Rank #${i + 1}`,
      value: i + 1,
    })),
  ];

  // Confirm Winner Modal - Fixed Z-Index
  const WinnerConfirmModal = () => {
    if (!showWinnerModal || !selectedUserId) return null;

    const user = data.leaderboard?.find((u) => u.userId === selectedUserId);

    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl relative z-[100000]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900">
              Confirm Winner Selection
            </h3>
            <button
              onClick={() => setShowWinnerModal(false)}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Icon icon="mdi:close" className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to select this user as the{" "}
              <strong className="text-primary-600">
                {activeTab === "daily" ? "Daily" : "Weekly"}
              </strong>{" "}
              winner?
            </p>

            {user && (
              <div className="p-4 bg-primary-50 rounded-xl border border-primary-100">
                <div className="flex items-center gap-3">
                  {user.profilePicture ? (
                    <img
                      src={user.profilePicture}
                      alt={user.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary-200 flex items-center justify-center">
                      <span className="text-primary-700 font-bold text-lg">
                        {user.name?.charAt(0)?.toUpperCase() || "U"}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-gray-900">{user.name}</p>
                    <p className="text-sm text-gray-600">{user.email}</p>
                    <p className="text-sm text-primary-600">
                      Rank #{user.rank} • {user.stats.correctAnswers} correct
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="w-full!"
              onClick={() => setShowWinnerModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className="w-full!"
              loading={selectingWinner}
              onClick={() => handleSelectWinner(selectedUserId)}
            >
              <Icon icon="mdi:crown" className="w-4 h-4" />
              Confirm Winner
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            🏆 Winners Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            View attempters and select daily/weekly winners
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("daily")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "daily"
              ? "bg-white text-primary-600 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
              }`}
          >
            <div className="flex items-center gap-2">
              <Icon icon="mdi:calendar-today" className="w-4 h-4" />
              Daily
            </div>
          </button>
          <button
            onClick={() => setActiveTab("weekly")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "weekly"
              ? "bg-white text-primary-600 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
              }`}
          >
            <div className="flex items-center gap-2">
              <Icon icon="mdi:calendar-week" className="w-4 h-4" />
              Weekly
            </div>
          </button>
        </div>
      </div>

      {/* Week Info (for weekly) */}
      {activeTab === "weekly" && data.week && (
        <div className="mb-6 p-4 bg-primary-50 border border-primary-100 rounded-xl">
          <div className="flex items-center gap-3 text-primary-700">
            <Icon icon="mdi:calendar-range" className="w-5 h-5" />
            <span className="font-medium">
              Week {data.week.weekNumber} ({data.week.year})
            </span>
            <span className="text-sm text-primary-600">
              {new Date(data.week.start).toLocaleDateString()} -{" "}
              {new Date(data.week.end).toLocaleDateString()}
            </span>
          </div>
        </div>
      )}

      {/* Selected Winner Card */}
      {selectedWinner && (
        <div className="mb-6 p-6 bg-gradient-to-r from-green-50 to-green-100/50 border border-green-200 rounded-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-green-600 flex items-center justify-center">
                <Icon icon="mdi:trophy" className="w-8 h-8 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-gray-900">
                    {selectedWinner.name}
                  </h2>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                    <Icon icon="mdi:crown" className="w-3.5 h-3.5" />
                    {activeTab === "daily" ? "Daily Winner" : "Weekly Winner"}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{selectedWinner.email}</p>
                <div className="flex items-center gap-4 mt-2 text-sm">
                  <span className="text-gray-600">
                    Score:{" "}
                    <strong className="text-green-600">
                      {selectedWinner.stats.correctAnswers}/
                      {selectedWinner.stats.totalQuestions}
                    </strong>
                  </span>
                  <span className="text-gray-600">
                    Accuracy:{" "}
                    <strong className="text-green-600">
                      {selectedWinner.stats.accuracy}%
                    </strong>
                  </span>
                  <span className="text-gray-600">
                    Time:{" "}
                    <strong className="text-blue-600">
                      {selectedWinner.stats.totalTime}s
                    </strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Prize section */}
            <div className="md:w-72 shrink-0">
              {prizeLoading ? (
                <div className="h-full min-h-[88px] bg-white/60 border border-green-200 rounded-xl animate-pulse" />
              ) : prize ? (
                <div className="bg-white border border-green-200 rounded-xl p-4">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700">
                      <Icon icon="mdi:gift" className="w-4 h-4" />
                      Prize Assigned
                    </span>
                    <button
                      onClick={openAssignPrizeModal}
                      className="text-gray-400 hover:text-primary-600 transition-colors"
                      title="Edit Prize"
                    >
                      <Icon icon="mdi:pencil-outline" className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    {prize.imageUrl && (
                      <img
                        src={prize.imageUrl}
                        alt={prize.title}
                        className="w-10 h-10 rounded-lg object-cover border border-gray-100"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {prize.title}
                      </p>
                      {prize.description && (
                        <p className="text-xs text-gray-500 truncate">
                          {prize.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <Button
                  variant="primary"
                  className="w-full!"
                  onClick={openAssignPrizeModal}
                >
                  <Icon icon="mdi:gift-outline" className="w-4 h-4" />
                  Assign Prize
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* No Winner Selected Message */}
      {!selectedWinner && !loading && (
        <div className="mb-6 p-6 bg-amber-50 border border-amber-200 rounded-2xl">
          <div className="flex items-center gap-3 text-amber-700">
            <Icon icon="mdi:alert-circle" className="w-6 h-6" />
            <div>
              <p className="font-medium">No winner selected yet</p>
              <p className="text-sm text-amber-600">
                Select a winner from the leaderboard below
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {loading ? (
        <SummaryCardSkeleton />
      ) : (
        <SummaryCards data={summaryData} />
      )}

      {/* Filters */}
      <div className="mt-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search by name or email..."
          />
        </div>
        <div className="w-full sm:w-48">
          <CustomDropdown
            icon="mdi:sort"
            placeholder="Filter by rank"
            options={rankOptions}
            value={filterRank}
            onChange={(value) => setFilterRank(value as number | "all")}
          />
        </div>
        <Button
          variant="secondary"
          className="!w-auto"
          onClick={() => {
            setSearchTerm("");
            setFilterRank("all");
          }}
        >
          <Icon icon="mdi:refresh" className="w-4 h-4" />
          Reset
        </Button>
      </div>

      {/* Leaderboard Table */}
      <div className="mt-6 bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon icon="mdi:leaderboard" className="w-5 h-5 text-primary-600" />
            <h3 className="font-semibold text-gray-900">Leaderboard</h3>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              {filteredLeaderboard?.length || 0} users
            </span>
          </div>
          {selectedWinner && (
            <span className="text-xs text-green-600 bg-green-50 px-3 py-1 rounded-full">
              Winner Selected
            </span>
          )}
        </div>
        <DataTable
          data={(filteredLeaderboard || []) as any}
          columns={(leaderboardColumns || []) as any}
          loading={loading}
          emptyIcon="mdi:account-off"
          emptyTitle="No participants yet"
          emptyDescription={
            activeTab === "daily"
              ? "No one has attempted the quiz today."
              : "No one has attempted the quiz this week."
          }
        />
      </div>

      {/* Correct Attempts */}
      <div className="mt-6 bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon icon="mdi:check-circle" className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-gray-900">Correct Attempts</h3>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              {data.correctAttempts?.length || 0} attempts
            </span>
          </div>
        </div>
        <DataTable
          data={data.correctAttempts?.map(item => ({
            ...item,
            _id: item.attemptId // Add _id for DataTable
          })) || []}
          columns={attemptsColumns}
          loading={loading}
          emptyIcon="mdi:close-circle"
          emptyTitle="No correct attempts"
          emptyDescription="No one has answered correctly yet."
        />
      </div>

      {/* Winner Confirm Modal */}
      <WinnerConfirmModal />

      {/* Assign / Edit Prize Modal */}
      <Modal
        isOpen={showPrizeModal}
        onClose={() => setShowPrizeModal(false)}
        title={prize ? "Edit Prize" : "Assign Prize"}
      >
        <form onSubmit={handleSavePrize} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Prize Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={prizeForm.title}
              onChange={(e) =>
                setPrizeForm((p) => ({ ...p, title: e.target.value }))
              }
              placeholder="e.g. Amazon Gift Card - Rs. 2000"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-gray-50/50 focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={prizeForm.description}
              onChange={(e) =>
                setPrizeForm((p) => ({ ...p, description: e.target.value }))
              }
              placeholder="Optional description..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-gray-50/50 focus:bg-white transition-all resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Prize Image
            </label>
            <label
              htmlFor="prize-image-upload"
              className="relative cursor-pointer rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 hover:border-primary-400 hover:bg-primary-50/40 transition-all overflow-hidden flex items-center justify-center"
            >
              {prizeForm.imagePreview || (prize && prize.imageUrl) ? (
                <div className="relative w-full h-36 group">
                  <img
                    src={prizeForm.imagePreview || prize?.imageUrl}
                    alt="Prize preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Icon icon="mdi:camera-retake-outline" className="w-7 h-7 text-white mb-1" />
                    <p className="text-white text-sm font-medium">Change Image</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                  <Icon icon="mdi:cloud-upload-outline" className="w-8 h-8 text-primary-500 mb-2" />
                  <p className="text-sm font-semibold text-gray-700">Click to upload an image</p>
                  <p className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP — max 5MB</p>
                </div>
              )}
              <input
                id="prize-image-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handlePrizeImageChange(file);
                  e.target.value = "";
                }}
              />
            </label>
            {prize && !prizeForm.imagePreview && prize.imageUrl && (
              <p className="mt-1.5 flex items-center gap-1 text-xs text-gray-500">
                <Icon icon="mdi:information-outline" className="w-3.5 h-3.5 text-blue-400" />
                Leave empty to keep the current image. Upload a new file to replace it.
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              className="w-full!"
              onClick={() => setShowPrizeModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="w-full!"
              loading={prizeSaving}
            >
              <Icon icon="mdi:gift" className="w-4 h-4" />
              {prize ? "Save Changes" : "Assign Prize"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}