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
import toast from "react-hot-toast";
import { downloadBlobResponse } from "@/utils/downloadFile";

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

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function WinnersManagement() {
  const [activeTab, setActiveTab] = useState<"daily" | "weekly">("daily");
  const [selectedDate, setSelectedDate] = useState(todayStr());
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
  const [exportingLeaderboard, setExportingLeaderboard] = useState(false);
  const [exportingCorrectAttempts, setExportingCorrectAttempts] = useState(false);

  // Fetch data based on active tab
  const fetchData = async () => {
    setLoading(true);
    try {
      const endpoint =
        activeTab === "daily"
          ? `/winners/attempters/daily?date=${selectedDate}`
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

  useEffect(() => {
    fetchData();
  }, [activeTab, selectedDate]);

  // Select winner
  const handleSelectWinner = async (userId: string) => {
    setSelectingWinner(true);
    try {
      const endpoint =
        activeTab === "daily"
          ? `/winners/select/daily/${userId}`
          : `/winners/select/weekly/${userId}`;

      const response = await axiosInstance.post(
        endpoint,
        activeTab === "daily" ? { date: selectedDate } : undefined
      );
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

  const handleExportLeaderboard = async () => {
    setExportingLeaderboard(true);
    try {
      const res = await axiosInstance.get(
        `/winners/attempters/daily/export/leaderboard?date=${selectedDate}`,
        { responseType: "blob" }
      );
      downloadBlobResponse(res.data, `leaderboard-${selectedDate}.xlsx`);
    } catch {
      toast.error("Export failed");
    } finally {
      setExportingLeaderboard(false);
    }
  };

  const handleExportCorrectAttempts = async () => {
    setExportingCorrectAttempts(true);
    try {
      const res = await axiosInstance.get(
        `/winners/attempters/daily/export/correct-attempts?date=${selectedDate}`,
        { responseType: "blob" }
      );
      downloadBlobResponse(res.data, `correct-attempts-${selectedDate}.xlsx`);
    } catch {
      toast.error("Export failed");
    } finally {
      setExportingCorrectAttempts(false);
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
        {activeTab === "daily" && (
          <div className="w-full sm:w-48">
            <input
              type="date"
              value={selectedDate}
              max={todayStr()}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            />
          </div>
        )}
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
            setSelectedDate(todayStr());
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
          <div className="flex items-center gap-3">
            {selectedWinner && (
              <span className="text-xs text-green-600 bg-green-50 px-3 py-1 rounded-full">
                Winner Selected
              </span>
            )}
            {activeTab === "daily" && (
              <Button
                variant="secondary"
                className="!w-auto !h-9 !px-3"
                icon="mdi:microsoft-excel"
                loading={exportingLeaderboard}
                disabled={(filteredLeaderboard?.length || 0) === 0}
                onClick={handleExportLeaderboard}
              >
                Download
              </Button>
            )}
          </div>
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
          {activeTab === "daily" && (
            <Button
              variant="secondary"
              className="!w-auto !h-9 !px-3"
              icon="mdi:microsoft-excel"
              loading={exportingCorrectAttempts}
              disabled={(data.correctAttempts?.length || 0) === 0}
              onClick={handleExportCorrectAttempts}
            >
              Download
            </Button>
          )}
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
    </div>
  );
}
