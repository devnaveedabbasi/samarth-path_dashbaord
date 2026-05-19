"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import toast from "react-hot-toast";
import { Icon } from "@iconify/react";
import axiosInstance from "@/config/axiosInstance";
import { getConfig } from "@/store/slicer";
import SearchInput from "@/components/ui/SearchInput";
import Image from "next/image";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserInfo {
  _id: string;
  name: string;
  email: string;
  phone: string;
  profilePicture?: string;
}

interface Consultation {
  _id: string;
  userId: UserInfo;
  sender: 'user' | 'admin';
  message: string;
  createdAt: string;
  editedAt?: string | null;
}

interface ChatUser {
  user: UserInfo;
  consultations: Consultation[];
  latestMessageAt: Date;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ConsultantsChatPage(): React.JSX.Element {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Reply State
  const [replyText, setReplyText] = useState("");
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchConsultations = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/consultant`, getConfig());
      if (res.data.success) {
        setConsultations(res.data.data);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to fetch consultations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchConsultations();
  }, [fetchConsultations]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [selectedUserId, consultations]);

  // Group consultations by user
  const chatUsers = useMemo(() => {
    const map = new Map<string, ChatUser>();

    consultations.forEach((c) => {
      if (!c.userId) return; // Skip if user is deleted or null

      const uid = c.userId._id;
      if (!map.has(uid)) {
        map.set(uid, {
          user: c.userId,
          consultations: [],
          latestMessageAt: new Date(0),
        });
      }

      const userGroup = map.get(uid)!;
      userGroup.consultations.push(c);

      const msgDate = new Date(c.createdAt);
      if (msgDate > userGroup.latestMessageAt) {
        userGroup.latestMessageAt = msgDate;
      }
    });

    // Sort users by latest message
    return Array.from(map.values()).sort((a, b) => b.latestMessageAt.getTime() - a.latestMessageAt.getTime());
  }, [consultations]);

  const filteredUsers = useMemo(() => {
    if (!searchInput) return chatUsers;
    const lowerSearch = searchInput.toLowerCase();
    return chatUsers.filter(
      (cu) =>
        cu.user.name?.toLowerCase().includes(lowerSearch) ||
        cu.user.email?.toLowerCase().includes(lowerSearch) ||
        cu.user.phone?.toLowerCase().includes(lowerSearch)
    );
  }, [chatUsers, searchInput]);

  const activeChatUser = useMemo(() => {
    return chatUsers.find((cu) => cu.user._id === selectedUserId) || null;
  }, [chatUsers, selectedUserId]);

  const activeConsultations = useMemo(() => {
    if (!activeChatUser) return [];
    return [...activeChatUser.consultations].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [activeChatUser]);

  // Handle Reply Submit
  const handleReplySubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!replyText.trim() || !activeChatUser) return;

    setIsSubmitting(true);
    try {
      if (replyingToId) {
        // Editing an existing admin reply
        const res = await axiosInstance.put(`/consultant/${replyingToId}`, { reply: replyText }, getConfig());
        if (res.data.success) {
          setConsultations((prev) =>
            prev.map((c) => c._id === replyingToId ? { ...c, message: replyText, editedAt: new Date().toISOString() } : c)
          );
        }
      } else {
        // Sending a new reply
        const res = await axiosInstance.post(`/consultant`, { userId: activeChatUser.user._id, reply: replyText }, getConfig());
        if (res.data.success) {
          // Append new message correctly avoiding re-fetch
          const newConsultation: Consultation = {
            ...res.data.data,
            userId: activeChatUser.user // Repopulate inline so UI matches immediately
          };
          setConsultations((prev) => [...prev, newConsultation]);
        }
      }
      setReplyText("");
      setReplyingToId(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to send reply");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, isUserMessage: boolean = false) => {
    if (!confirm(`Are you sure you want to delete this ${isUserMessage ? 'message' : 'reply'}?`)) return;
    try {
      const res = await axiosInstance.delete(`/consultant/${id}`, getConfig());
      if (res.data.success) {
        toast.success("Deleted successfully");
        setConsultations((prev) => prev.filter((c) => c._id !== id));
        if (replyingToId === id) setReplyingToId(null);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to delete");
    }
  };

  const startEditing = (consultation: Consultation) => {
    setReplyingToId(consultation._id);
    setReplyText(consultation.message || "");
  };

  const cancelEditing = () => {
    setReplyingToId(null);
    setReplyText("");
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#F8FAFC] p-4 sm:p-6 lg:p-8 flex flex-col">
      <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col">
        <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              Consultations Chat
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Interact with users and reply to their inquiries.
            </p>
          </div>
          <button
            onClick={() => fetchConsultations()}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:text-primary-600 transition-all shadow-sm font-medium text-sm disabled:opacity-50"
          >
            <Icon
              icon="mdi:refresh"
              className={`w-5 h-5 ${loading ? "animate-spin text-primary-500" : ""}`}
            />
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="bg-white border border-gray-100 shadow-sm rounded-2xl flex-1 flex overflow-hidden min-h-[600px] h-[calc(100vh-200px)]">
          {/* Left Sidebar (User List) */}
          <div className={`${selectedUserId ? 'hidden md:flex' : 'flex'} w-full md:w-[350px] border-r border-gray-100 flex-col bg-white shrink-0`}>
            <div className="p-4 border-b border-gray-100">
              <SearchInput
                value={searchInput}
                onChange={setSearchInput}
                placeholder="Search users..."
              />
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {loading && !chatUsers.length ? (
                <div className="p-8 flex justify-center">
                  <Icon icon="mdi:loading" className="w-8 h-8 animate-spin text-primary-500" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">
                  No users found.
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {filteredUsers.map((cu) => (
                    <button
                      key={cu.user._id}
                      onClick={() => {
                        setSelectedUserId(cu.user._id);
                        cancelEditing();
                      }}
                      className={`w-full text-left p-4 hover:bg-gray-50 transition-colors flex items-center gap-3 ${selectedUserId === cu.user._id ? "bg-primary-50/50 hover:bg-primary-50/50" : ""
                        }`}
                    >
                      <div className="relative">
                        {cu.user.profilePicture ? (
                          <Image
                            src={cu.user.profilePicture}
                            alt={cu.user.name}
                            width={48}
                            height={48}
                            className="w-12 h-12 rounded-full object-cover border border-gray-200"
                            unoptimized
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                            {cu.user.name?.charAt(0)?.toUpperCase()}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {cu.user.name}
                          </p>
                          <span className="text-[10px] text-gray-400 shrink-0">
                            {cu.latestMessageAt.toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          {cu.user.email || cu.user.phone}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Area (Chat View) */}
          <div className={`${selectedUserId ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-[#F8FAFC] relative`}>
            {activeChatUser ? (
              <>
                {/* Chat Header */}
                <div className="h-[72px] bg-white border-b border-gray-100 flex items-center px-4 sm:px-6 shrink-0 justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      className="md:hidden p-2 -ml-2 text-gray-500 hover:text-gray-700"
                      onClick={() => setSelectedUserId(null)}
                    >
                      <Icon icon="mdi:arrow-left" className="w-6 h-6" />
                    </button>
                    {activeChatUser.user.profilePicture ? (
                      <Image
                        src={activeChatUser.user.profilePicture}
                        alt={activeChatUser.user.name}
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                        {activeChatUser.user.name?.charAt(0)?.toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h2 className="text-base font-bold text-gray-900 leading-tight">
                        {activeChatUser.user.name}
                      </h2>
                      <p className="text-xs text-gray-500">
                        {activeChatUser.user.email || activeChatUser.user.phone}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                  {activeConsultations.map((c) => (
                    <div key={c._id} className="space-y-4">
                      {/* User Message Bubble */}
                      {c.sender === "user" ? (
                        <div className="flex justify-start">
                          <div className="max-w-[75%] group relative">
                            <div className="bg-white border border-gray-200 text-gray-800 p-4 rounded-2xl rounded-tl-sm shadow-sm">
                              <p className="text-sm whitespace-pre-wrap">{c.message}</p>
                              <span className="text-[10px] text-gray-400 mt-2 block">
                                {new Date(c.createdAt).toLocaleString()}
                              </span>
                            </div>
                            {/* Actions for User Message */}
                            {/* <div className="absolute top-2 -right-10 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                              <button
                                onClick={() => handleDelete(c._id, true)}
                                className="p-1.5 bg-white border border-gray-200 rounded-full text-red-500 hover:bg-red-50 shadow-sm"
                                title="Delete user message"
                              >
                                <Icon icon="mdi:trash-can-outline" className="w-4 h-4" />
                              </button>
                            </div> */}
                          </div>
                        </div>
                      ) : (
                        /* Admin Reply Bubble */
                        <div className="flex justify-end">
                          <div className="max-w-[75%] group relative">
                            {/* Actions for Admin Reply */}
                            <div className="absolute top-2 -left-16 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                              <button
                                onClick={() => startEditing(c)}
                                className="p-1.5 bg-white border border-gray-200 rounded-full text-primary-600 hover:bg-primary-50 shadow-sm"
                                title="Edit reply"
                              >
                                <Icon icon="mdi:pencil-outline" className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(c._id, false)}
                                className="p-1.5 bg-white border border-gray-200 rounded-full text-red-500 hover:bg-red-50 shadow-sm"
                                title="Delete reply"
                              >
                                <Icon icon="mdi:trash-can-outline" className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="bg-primary-600 text-white p-4 rounded-2xl rounded-tr-sm shadow-sm">
                              <p className="text-sm whitespace-pre-wrap">{c.message}</p>
                              <span className="text-[10px] text-primary-100 mt-2 block text-right">
                                {new Date(c.editedAt || c.createdAt).toLocaleString()} {c.editedAt && "(Edited)"}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Reply Input Area */}
                <div className="bg-white border-t border-gray-100 p-4 shrink-0">
                  {replyingToId && (
                    <div className="mb-2 flex items-center justify-between bg-primary-50 px-3 py-2 rounded-lg border border-primary-100">
                      <div className="flex items-center gap-2 text-xs text-primary-700">
                        <Icon icon="mdi:pencil-outline" className="w-4 h-4" />
                        <span>Editing reply</span>
                      </div>
                      <button onClick={cancelEditing} className="text-primary-500 hover:text-primary-700 p-1">
                        <Icon icon="mdi:close" className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <form onSubmit={handleReplySubmit} className="flex gap-3 items-end">
                    <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary-500/20 focus-within:border-primary-500 transition-all">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Type a new reply..."
                        rows={replyText.split('\n').length > 1 ? Math.min(replyText.split('\n').length, 5) : 1}
                        className="w-full max-h-[120px] bg-transparent px-4 py-3 text-sm text-gray-800 resize-none outline-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleReplySubmit();
                          }
                        }}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmitting || !replyText.trim()}
                      className="bg-primary-600 hover:bg-primary-700 text-white p-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex shrink-0 h-[46px] items-center justify-center w-[46px]"
                    >
                      {isSubmitting ? (
                        <Icon icon="mdi:loading" className="w-5 h-5 animate-spin" />
                      ) : (
                        <Icon icon="mdi:send" className="w-5 h-5" />
                      )}
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-4">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
                  <Icon icon="mdi:message-text-outline" className="w-10 h-10 text-gray-300" />
                </div>
                <p className="text-sm font-medium">Select a user to start chatting</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
