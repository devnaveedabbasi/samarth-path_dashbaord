"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, ChevronDown, LogOut, User, Menu } from "lucide-react";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { logoutUser, userDetails } from "@/store/slices/auth";
import { useRouter } from "next/navigation";
import Image from "next/image";

type TopbarProps = {
  onMenuClick: () => void;
};

export default function Topbar({ onMenuClick }: TopbarProps) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { userDetails: user, loading } = useAppSelector((state) => state.auth);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // useEffect(() => {
  //   dispatch(userDetails());
  // }, [dispatch]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsDropdownOpen(false);
    const result = await dispatch(logoutUser());
    if (logoutUser.fulfilled.match(result)) {
      router.push("/auth/login");
    }
  };

  const getInitials = () => {
    if (user?.name) return user.name.charAt(0).toUpperCase();
    if (user?.fullName) return user.fullName.charAt(0).toUpperCase();
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return "U";
  };

  const displayName = user?.name || user?.fullName || "User";
  const userEmail = user?.email || "";

  return (
    <header className="h-16 bg-white border-b border-gray-300 flex items-center justify-between px-4 sm:px-6 fixed top-0 right-0 left-0 lg:left-56 z-10">
      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        aria-label="Open sidebar"
      >
        <Menu size={20} />
      </button>

      {/* Spacer on desktop (hamburger is hidden, so push user menu to right) */}
      <div className="hidden lg:block" />

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* User Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 sm:gap-3 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-8 h-8 bg-primary-600 text-white flex items-center justify-center rounded-full flex-shrink-0">
              {user?.profilePicture ? (
                <Image
                  src={user.profilePicture}
                  alt={displayName}
                  width={32}
                  height={32}
                  className="rounded-full object-cover"
                />
              ) : (
                <span className="text-sm font-medium">{getInitials()}</span>
              )}
            </div>

            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-gray-800">{displayName}</p>
              <p className="text-xs text-gray-500">{user?.role || "User"}</p>
            </div>

            <ChevronDown size={16} className="text-gray-400" />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg py-1 z-20">
              <div className="px-4 py-3 border-b border-gray-300">
                <p className="text-sm font-medium text-gray-900">{displayName}</p>
                <p className="text-xs text-gray-500 truncate">{userEmail}</p>
              </div>

              <Link
                href="/dashboard/profile"
                onClick={() => setIsDropdownOpen(false)}
                className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <User size={16} />
                Profile
              </Link>

              <div className="border-t border-gray-300 my-1" />

              <button
                onClick={handleLogout}
                disabled={loading}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut size={16} />
                {loading ? "Logging out..." : "Logout"}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}