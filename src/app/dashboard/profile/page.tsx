"use client";

import { useAppSelector } from "@/hooks/redux";
import Image from "next/image";

export default function ProfilePage() {
  const { userDetails } = useAppSelector((state) => state.auth);

  if (!userDetails) return null;

  const updateProfile = () => {
    // Implement profile update logic here
  }

  const getInitials = () => {
    const name = userDetails?.name || userDetails?.fullName || "User";
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="bg-primary-600 h-32"></div>
        <div className="px-6 pb-6">
          <div className="flex justify-center -mt-12 mb-4">
            <div className="w-24 h-24 bg-primary-600 text-white flex items-center justify-center rounded-full border-4 border-white shadow-lg">
              {userDetails?.profilePicture ? (
                <Image
                  src={userDetails.profilePicture}
                  alt={userDetails?.name || "User"}
                  width={96}
                  height={96}
                  className="rounded-full object-cover"
                />
              ) : (
                <span className="text-3xl font-bold">{getInitials()}</span>
              )}
            </div>
          </div>
          
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">
              {userDetails?.name || userDetails?.fullName}
            </h1>
            <p className="text-gray-600 mt-1">{userDetails?.email}</p>
            <p className="text-sm text-primary-600 mt-1 capitalize">{userDetails?.role || "User"}</p>
          </div>

          <div className="mt-6 border-t pt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h2>
            <div className="space-y-3">
              <div className="flex">
                <span className="w-32 text-gray-500">Full Name:</span>
                <span className="text-gray-900">{userDetails?.name || userDetails?.fullName}</span>
              </div>
              <div className="flex">
                <span className="w-32 text-gray-500">Email:</span>
                <span className="text-gray-900">{userDetails?.email}</span>
              </div>
              <div className="flex">
                <span className="w-32 text-gray-500">Phone:</span>
                <span className="text-gray-900">{userDetails?.phone || "Not provided"}</span>
              </div>
              <div className="flex">
                <span className="w-32 text-gray-500">Role:</span>
                <span className="text-gray-900 capitalize">{userDetails?.role || "User"}</span>
              </div>
              <div className="flex">
                <span className="w-32 text-gray-500">Status:</span>
                <span className="text-green-600 capitalize">{userDetails?.status || "Active"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}