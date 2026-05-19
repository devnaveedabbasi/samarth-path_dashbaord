"use client";

import React, { useEffect, useState, use } from "react";
import { Icon } from "@iconify/react";
import axiosInstance from "@/config/axiosInstance";
import { getConfig } from "@/store/slicer";
import toast from "react-hot-toast";
import Link from "next/link";
import Loader from "@/components/ui/Loader";

interface JobDetails {
  _id: string;
  orderId: string;
  amount: number;
  status: string;
  paymentStatus: string;
  customer: { name: string; email: string; phoneNumber: string };
  provider: { userId: { name: string; email: string; phoneNumber: string } };
  service: { name: string; price: number; description: string };
  createdAt: string;
  acceptedAt?: string;
  startedAt?: string;
  completedByProviderAt?: string;
  confirmedByUserAt?: string;
  cancelledAt?: string;
}

export default function JobDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [job, setJob] = useState<JobDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const fetchJobDetails = async () => {
      try {
        const response = await axiosInstance.get(`/jobs/${id}`, getConfig());
        if (response.data.success) {
          setJob(response.data.data);
        }
      } catch (error: any) {
        toast.error("Failed to fetch job details");
      } finally {
        setLoading(false);
      }
    };
    fetchJobDetails();
  }, [id]);

  const updateStatus = async (newStatus: string) => {
    setActionLoading(true);
    try {
      const response = await axiosInstance.patch(`/jobs/${id}/status`, { status: newStatus }, getConfig());
      if (response.data.success) {
        setJob({ ...job!, status: newStatus });
        toast.success(`Job status updated to ${newStatus}`);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update status");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <Loader loading={loading} title="Loading Job Details..." />;
  if (!job) return <div className="p-8 text-center flex flex-col justify-center items-center text-red-500">
    <h1 className="text-xl font-semibold">Job not found</h1>
    <Icon icon='mdi:not-found' width={50} height={50} />
    <p className="text-gray-500">The job you are looking for does not exist.</p>
  </div>;

  const timeline = [
    { label: "Booked", date: job.createdAt, icon: "mdi:calendar-plus", active: true },
    { label: "Accepted", date: job.acceptedAt, icon: "mdi:check-all", active: !!job.acceptedAt },
    { label: "Started", date: job.startedAt, icon: "mdi:play-circle-outline", active: !!job.startedAt },
    { label: "Completed", date: job.confirmedByUserAt, icon: "mdi:flag-checkered", active: !!job.confirmedByUserAt },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 lg:p-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/jobs" className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
            <Icon icon="mdi:arrow-left" className="w-6 h-6 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Job #{job.orderId || "Details"}</h1>
            <p className="text-sm text-gray-500">View and manage service booking details.</p>
          </div>
        </div>
        {/* <div className="flex gap-3">
          {job.status !== 'cancelled' && job.status !== 'confirmed_by_user' && (
            <>
              <button
                onClick={() => updateStatus('cancelled')}
                disabled={actionLoading}
                className="px-4 py-2 bg-white border border-red-200 text-red-600 rounded-xl hover:bg-red-50 font-medium transition-all"
              >
                Cancel Job
              </button>
              <button
                onClick={() => updateStatus('confirmed_by_user')}
                disabled={actionLoading}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-medium transition-all"
              >
                Mark as Completed
              </button>
            </>
          )}
        </div> */}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Job Overview */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Service Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Service Name</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">{job.service?.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Booking Amount</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">BDT {job.amount}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Status</p>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold capitalize mt-1 ${job.status === 'confirmed_by_user' ? 'bg-emerald-50 text-emerald-700' :
                    job.status === 'cancelled' ? 'bg-red-50 text-red-700' :
                      'bg-amber-50 text-amber-700'
                    }`}>
                    {job.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Payment Status</p>
                  <span className="text-sm font-medium text-blue-600 capitalize block mt-1">{job.paymentStatus.replace(/_/g, ' ')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-8">Job Timeline</h3>
            <div className="relative flex justify-between">
              <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-100 -z-0"></div>
              {timeline.map((step, i) => (
                <div key={step.label} className="flex flex-col items-center gap-3 relative z-10">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-sm ${step.active ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-400"
                    }`}>
                    <Icon icon={step.icon} className="w-5 h-5" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-gray-900">{step.label}</p>
                    <p className="text-[10px] text-gray-500 mt-1">
                      {step.date ? new Date(step.date).toLocaleDateString() : "Pending"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-8">
          {/* Customer & Provider Cards */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Parties Involved</h3>
            <div className="space-y-6">
              <div className="p-4 bg-gray-50 rounded-2xl">
                <p className="text-[10px] text-gray-400 uppercase font-bold mb-2">Customer</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                    {job.customer?.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{job.customer?.name}</p>
                    <p className="text-xs text-gray-500">{job.customer?.email}</p>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl">
                <p className="text-[10px] text-gray-400 uppercase font-bold mb-2">Provider</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
                    {job.provider?.userId?.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{job.provider?.userId?.name}</p>
                    <p className="text-xs text-gray-500">{job.provider?.userId?.email}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
