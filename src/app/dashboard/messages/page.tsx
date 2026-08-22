"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Send,
  User,
  Users,
  Search,
  Check,
  CheckCheck,
  Smile,
  Plus,
  ArrowLeft,
  Image as ImageIcon,
  X,
  Edit3,
  Trash2,
  Reply,
  Copy,
  ExternalLink,
  Info,
  Heart,
  MoreVertical,
  ChevronDown,
  AlertCircle,
  Sparkles,
  Loader2,
  FolderKanban,
  Bell,
  BellOff,
  Grid,
  ChevronRight,
  Download
} from "lucide-react";
import { TeamCoreShell } from "@/components/layout/TeamCoreShell";
import { CodeXaAvatar } from "@/components/ui/CodeXaAvatar";
import { Conversation, ChatMessage, Profile } from "@/lib/data-store";
import { useAuth } from "@/context/AuthContext";

const QUICK_EMOJIS = ["❤️", "😂", "😮", "😢", "😡", "👍", "🔥", "🚀", "👏", "🎉", "💯", "✨"];
const REACTION_BAR_EMOJIS = ["❤️", "😂", "😮", "😢", "😡", "👍"];

type CategoryTab = "ALL" | "DIRECT" | "CHANNELS" | "UNREAD";

function MessagesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetUserIdParam = searchParams?.get("user");
  const targetUsernameParam = searchParams?.get("username");
  const targetConvIdParam = searchParams?.get("conversation");

  const { user: currentUser } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [teamMembers, setTeamMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);

  // Search & Filter
  const [categoryTab, setCategoryTab] = useState<CategoryTab>("ALL");
  const [chatSearch, setChatSearch] = useState("");
  const [newMsgModalOpen, setNewMsgModalOpen] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");

  // Chat Details Drawer
  const [chatDetailsOpen, setChatDetailsOpen] = useState(false);
  const [detailsTab, setDetailsTab] = useState<"INFO" | "MEDIA">("INFO");

  // Composer States
  const [messageText, setMessageText] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviewUrls, setFilePreviewUrls] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [heartAnimMessageId, setHeartAnimMessageId] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  // Lightbox
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);

  // New Messages Floating Scroll Pill
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // Refs
  const messageStreamRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ── 1. Load Session & Initial Data ──────────────────────────────────────────
  useEffect(() => {
    if (currentUser?.id) {
      loadConversationsAndMembers(currentUser.id);
    }
  }, [currentUser]);

  const loadConversationsAndMembers = async (userId: string) => {
    setLoading(true);
    try {
      const [convRes, teamRes] = await Promise.all([
        fetch("/api/chat/conversations").then((r) => r.json()),
        fetch("/api/team/public").then((r) => r.json()),
      ]);

      const convList: Conversation[] = convRes.conversations || [];
      setConversations(convList);

      const membersList: Profile[] = (teamRes.profiles || []).filter((p: Profile) => p.id !== userId);
      setTeamMembers(membersList);

      // Check if target user param was passed in URL (?user=... or ?username=...)
      if (targetUserIdParam || targetUsernameParam) {
        const targetIdentifier = targetUserIdParam || targetUsernameParam!;
        await handleOpenDirectChatWithUser(targetIdentifier, convList);
      } else if (targetConvIdParam) {
        const targetConv = convList.find((c) => c.id === targetConvIdParam);
        if (targetConv) {
          setActiveConvId(targetConv.id);
          loadMessages(targetConv.id);
        }
      } else if (convList.length > 0) {
        setActiveConvId(convList[0].id);
        loadMessages(convList[0].id);
      }
    } catch (err) {
      console.error("[Messages] Load Error:", err);
    } finally {
      setLoading(false);
    }
  };

  // ── 2. Open Direct Chat With User ───────────────────────────────────────────
  const handleOpenDirectChatWithUser = async (targetIdOrUsername: string, existingConvs?: Conversation[]) => {
    try {
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: targetIdOrUsername }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.conversation) {
        const newConv = data.conversation;
        setConversations((prev) => {
          if (!prev.some((c) => c.id === newConv.id)) {
            return [newConv, ...prev];
          }
          return prev;
        });
        setActiveConvId(newConv.id);
        loadMessages(newConv.id);
        setNewMsgModalOpen(false);
        setTimeout(() => textareaRef.current?.focus(), 150);
      }
    } catch (err) {
      console.error("[handleOpenDirectChatWithUser]", err);
    }
  };

  // ── 3. Load Messages for Active Conversation ────────────────────────────────
  const loadMessages = async (convId: string, isSilent = false) => {
    if (!isSilent) setMessagesLoading(true);
    try {
      const res = await fetch(`/api/chat/messages?conversationId=${convId}`);
      const data = await res.json();
      if (res.ok && data.success && data.messages) {
        setMessages(data.messages);
        // Mark as read
        fetch("/api/chat/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId: convId }),
        }).catch(() => {});

        // Reset unread count locally
        setConversations((prev) =>
          prev.map((c) => (c.id === convId ? { ...c, unreadCount: 0 } : c))
        );
      }
    } catch (err) {
      console.error("[loadMessages]", err);
    } finally {
      if (!isSilent) setMessagesLoading(false);
    }
  };

  // ── 4. Polling Live Updates (every 2.5s) ─────────────────────────────────────
  useEffect(() => {
    if (!activeConvId) return;

    loadMessages(activeConvId);

    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    pollTimerRef.current = setInterval(() => {
      loadMessages(activeConvId, true);
    }, 2500);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [activeConvId]);

  // Scroll listener for "New messages ↓" button
  const handleScroll = () => {
    if (!messageStreamRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messageStreamRef.current;
    const isUp = scrollHeight - scrollTop - clientHeight > 150;
    setShowScrollBottom(isUp);
  };

  // Scroll to bottom on new messages if near bottom
  useEffect(() => {
    if (!showScrollBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, showScrollBottom]);

  // ── 5. Multi-Image Selection Handler (Up to 4 images) ───────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles: File[] = [];
    const newPreviewUrls: string[] = [];

    const totalAllowed = 4 - selectedFiles.length;
    if (totalAllowed <= 0) {
      alert("Maximum 4 images per message.");
      return;
    }

    const filesToProcess = files.slice(0, totalAllowed);

    for (const file of filesToProcess) {
      if (!file.type.startsWith("image/")) {
        alert(`${file.name} is not an image file (JPG, PNG, WEBP, GIF).`);
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert(`${file.name} exceeds 10MB limit.`);
        continue;
      }
      validFiles.push(file);
      newPreviewUrls.push(URL.createObjectURL(file));
    }

    setSelectedFiles((prev) => [...prev, ...validFiles]);
    setFilePreviewUrls((prev) => [...prev, ...newPreviewUrls]);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setFilePreviewUrls((prev) => prev.filter((_, i) => i !== index));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const clearAllFiles = () => {
    setSelectedFiles([]);
    setFilePreviewUrls([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── 6. Send Message ─────────────────────────────────────────────────────────
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeConvId) return;

    const trimmed = messageText.trim();
    if (!trimmed && selectedFiles.length === 0) return;

    setSendError(null);

    // Handle Edit Mode
    if (editingMessage) {
      try {
        const res = await fetch(`/api/chat/messages/${editingMessage.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed }),
        });
        const data = await res.json();
        if (res.ok && data.success && data.message) {
          setMessages((prev) => prev.map((m) => (m.id === data.message.id ? data.message : m)));
          setEditingMessage(null);
          setMessageText("");
        }
      } catch (err) {
        setSendError("Failed to edit message.");
      }
      return;
    }

    // Upload selected images (up to 4)
    const uploadedAttachments: any[] = [];
    if (selectedFiles.length > 0) {
      setUploadingImage(true);
      try {
        for (const file of selectedFiles) {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("conversationId", activeConvId);

          const upRes = await fetch("/api/chat/upload", {
            method: "POST",
            body: formData,
          });
          const upData = await upRes.json();
          if (upRes.ok && upData.success && upData.attachment) {
            uploadedAttachments.push(upData.attachment);
          }
        }
      } catch (err) {
        console.error("[Upload Image Error]", err);
      } finally {
        setUploadingImage(false);
      }
    }

    const payload = {
      conversationId: activeConvId,
      message: trimmed,
      attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
      fileUrl: uploadedAttachments[0]?.url,
      fileName: uploadedAttachments[0]?.name,
      replyToId: replyingTo?.id || null,
    };

    setMessageText("");
    clearAllFiles();
    setReplyingTo(null);

    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success && data.message) {
        setMessages((prev) => [...prev, data.message]);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      } else {
        setSendError("Failed to send message. Please retry.");
      }
    } catch (err) {
      console.error("[Send Message Error]", err);
      setSendError("Network error sending message.");
    }
  };

  // Keyboard shortcut (Enter to send, Shift+Enter for newline)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // ── 7. Reaction Handling ───────────────────────────────────────────────────
  const handleToggleReaction = async (messageId: string, emoji: string) => {
    if (emoji === "❤️") {
      setHeartAnimMessageId(messageId);
      setTimeout(() => setHeartAnimMessageId(null), 900);
    }

    try {
      const res = await fetch("/api/chat/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, emoji }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.reactions) {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, reactions: data.reactions } : m))
        );
      }
    } catch {}
  };

  // ── 8. Unsend / Delete Message ──────────────────────────────────────────────
  const handleUnsendMessage = async (messageId: string) => {
    if (!confirm("Unsend this message? It will be replaced for everyone in this chat.")) return;
    try {
      const res = await fetch(`/api/chat/messages?id=${messageId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, isDeleted: true, message: "", attachments: [] } : m))
        );
      }
    } catch {}
  };

  // ── 9. Delete Chat For Me (Hide Conversation) ──────────────────────────────
  const handleDeleteChatForMe = async (convId: string) => {
    if (!confirm("Delete this chat from your inbox? Other participants will still keep their history.")) return;
    try {
      const res = await fetch(`/api/chat/conversations?id=${convId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setConversations((prev) => prev.filter((c) => c.id !== convId));
        setActiveConvId("");
        setMessages([]);
        setChatDetailsOpen(false);
      }
    } catch {}
  };

  // ── 10. Copy Text ───────────────────────────────────────────────────────────
  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const activeConv = conversations.find((c) => c.id === activeConvId);
  const activeOtherMember = activeConv?.otherMember;

  // Filter conversations by category tab & search query
  const filteredConversations = conversations.filter((c) => {
    // Category tab filter
    if (categoryTab === "DIRECT" && c.type !== "DIRECT") return false;
    if (categoryTab === "CHANNELS" && c.type !== "GROUP" && c.type !== "PROJECT") return false;
    if (categoryTab === "UNREAD" && (!c.unreadCount || c.unreadCount === 0)) return false;

    // Text search query
    const q = chatSearch.toLowerCase();
    if (!q) return true;
    const titleMatch = c.title?.toLowerCase().includes(q);
    const memberMatch =
      c.otherMember?.displayName.toLowerCase().includes(q) ||
      c.otherMember?.username.toLowerCase().includes(q);
    const textMatch = c.lastMessageText?.toLowerCase().includes(q);
    return titleMatch || memberMatch || textMatch;
  });

  const filteredMembers = teamMembers.filter((m) => {
    const q = memberSearchQuery.toLowerCase();
    if (!q) return true;
    return (
      m.displayName.toLowerCase().includes(q) ||
      m.username.toLowerCase().includes(q) ||
      m.headline?.toLowerCase().includes(q)
    );
  });

  // Extract shared media photos across the active conversation
  const sharedMediaPhotos = messages
    .filter((m) => !m.isDeleted && m.attachments && m.attachments.length > 0)
    .flatMap((m) => m.attachments || []);

  return (
    <TeamCoreShell
      title="Direct Messages"
      subtitle="Encrypted Private Communications & Channels"
      actions={
        <button
          onClick={() => setNewMsgModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(217,4,41,0.3)] flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" /> New Message
        </button>
      }
    >
      <div className="h-[78vh] rounded-3xl bg-[#080808] border border-crimson/25 overflow-hidden flex flex-col md:flex-row shadow-2xl relative">
        
        {/* ═════════════════════════════════════════════════════════════════════
            LEFT PANEL: CONVERSATION LIST (CATEGORIES + SEARCH + STREAM)
        ══════════════════════════════════════════════════════════════════════ */}
        <div
          className={`w-full md:w-80 lg:w-96 border-r border-crimson/15 flex flex-col justify-between bg-[#0A0A0A] flex-shrink-0 ${
            activeConvId ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Top Search & Filter */}
          <div className="p-3.5 border-b border-white/5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-orbitron font-black text-xs text-white uppercase tracking-widest flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-bright-red" /> Direct Messages
              </span>
              <button
                onClick={() => setNewMsgModalOpen(true)}
                className="p-1.5 rounded-lg bg-[#141414] hover:bg-deep-red/20 text-[#888] hover:text-white transition-colors"
                title="Start New DM"
              >
                <Plus className="w-4 h-4 text-bright-red" />
              </button>
            </div>

            {/* Category Tabs: ALL | DIRECT | CHANNELS | UNREAD */}
            <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-[#121212] border border-white/5 text-[10px] font-orbitron">
              {(["ALL", "DIRECT", "CHANNELS", "UNREAD"] as CategoryTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setCategoryTab(tab)}
                  className={`py-1 rounded-lg text-center font-bold transition-colors ${
                    categoryTab === tab
                      ? "bg-crimson text-white shadow-sm"
                      : "text-[#777] hover:text-white"
                  }`}
                >
                  {tab === "CHANNELS" ? "ROOMS" : tab}
                </button>
              ))}
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#666] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={chatSearch}
                onChange={(e) => setChatSearch(e.target.value)}
                placeholder="Search conversations..."
                className="w-full bg-[#121212] border border-crimson/20 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-[#555] outline-none focus:border-bright-red transition-colors"
              />
            </div>
          </div>

          {/* Conversation List Stream */}
          <div className="flex-1 overflow-y-auto divide-y divide-white/5">
            {loading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="w-10 h-10 rounded-full bg-white/5" />
                    <div className="space-y-1 flex-1">
                      <div className="w-24 h-3 bg-white/5 rounded" />
                      <div className="w-36 h-2 bg-white/5 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <p className="text-xs text-[#777]">No conversations found.</p>
                <button
                  onClick={() => setNewMsgModalOpen(true)}
                  className="px-4 py-1.5 rounded-xl bg-crimson text-white text-[10px] font-orbitron font-bold uppercase"
                >
                  Start a DM
                </button>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isActive = activeConvId === conv.id;
                const other = conv.otherMember;
                const isDirect = conv.type === "DIRECT";

                return (
                  <div
                    key={conv.id}
                    onClick={() => {
                      setActiveConvId(conv.id);
                      loadMessages(conv.id);
                    }}
                    className={`p-3.5 flex items-center justify-between cursor-pointer transition-colors ${
                      isActive
                        ? "bg-crimson/15 border-l-2 border-bright-red"
                        : "hover:bg-[#121212]"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative">
                        {isDirect ? (
                          <CodeXaAvatar
                            src={other?.mediaUrl || "/assets/images/128acbeb739b3eb8bc4d1d9ae15fcfb2.jpg"}
                            alt={other?.displayName || "Member"}
                            size="sm"
                          />
                        ) : conv.type === "PROJECT" ? (
                          <div className="w-9 h-9 rounded-full bg-deep-red/30 border border-crimson/40 flex items-center justify-center text-bright-red">
                            <FolderKanban className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-deep-red/30 border border-crimson/40 flex items-center justify-center text-bright-red">
                            <Users className="w-4 h-4" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-orbitron font-bold text-xs text-white truncate">
                            {isDirect ? other?.displayName || conv.title : conv.title}
                          </p>
                          {isDirect && other?.username && (
                            <span className="text-[9px] font-mono text-crimson">@{other.username}</span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#888] truncate mt-0.5 max-w-[180px]">
                          {conv.lastMessageText || "No messages yet"}
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-[9px] font-mono text-[#666]">
                        {conv.lastMessageAt
                          ? new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                          : ""}
                      </span>
                      {conv.unreadCount !== undefined && conv.unreadCount > 0 && (
                        <span className="w-4 h-4 rounded-full bg-crimson text-white font-mono text-[9px] font-bold flex items-center justify-center animate-pulse">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════════════════
            RIGHT PANEL: ACTIVE CHAT & MESSAGE STREAM & DETAILS DRAWER
        ══════════════════════════════════════════════════════════════════════ */}
        <div
          className={`flex-1 flex flex-col justify-between bg-[#070707] relative ${
            !activeConvId ? "hidden md:flex" : "flex"
          }`}
        >
          {activeConv ? (
            <>
              {/* Active Chat Header */}
              <div className="h-16 px-4 sm:px-6 border-b border-crimson/20 bg-[#090909]/95 backdrop-blur-md flex items-center justify-between flex-shrink-0 z-10">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Mobile Back button */}
                  <button
                    onClick={() => setActiveConvId("")}
                    className="md:hidden p-1.5 rounded-lg bg-[#141414] text-[#888] hover:text-white"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  {activeConv.type === "DIRECT" ? (
                    <CodeXaAvatar
                      src={activeOtherMember?.mediaUrl || "/assets/images/128acbeb739b3eb8bc4d1d9ae15fcfb2.jpg"}
                      alt={activeOtherMember?.displayName || "Member"}
                      size="sm"
                      showGlow
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-deep-red/30 border border-crimson/40 flex items-center justify-center text-bright-red">
                      <Users className="w-4 h-4" />
                    </div>
                  )}

                  <div className="min-w-0">
                    <h3 className="font-orbitron font-bold text-xs sm:text-sm text-white truncate">
                      {activeConv.type === "DIRECT" ? activeOtherMember?.displayName || activeConv.title : activeConv.title}
                    </h3>
                    <div className="flex items-center gap-2">
                      {activeConv.type === "DIRECT" && activeOtherMember?.username && (
                        <span className="text-[10px] font-mono text-crimson">@{activeOtherMember.username}</span>
                      )}
                      {activeOtherMember?.headline && (
                        <span className="text-[10px] text-[#777] hidden sm:inline truncate">&bull; {activeOtherMember.headline}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {activeConv.type === "DIRECT" && activeOtherMember?.username && (
                    <Link
                      href={`/team/${activeOtherMember.username}`}
                      target="_blank"
                      className="px-3 py-1.5 rounded-xl bg-[#141414] hover:bg-deep-red/20 border border-crimson/20 text-white text-[10px] font-orbitron font-bold uppercase tracking-wider transition-colors hidden sm:flex items-center gap-1"
                    >
                      <User className="w-3 h-3 text-bright-red" /> View Profile
                    </Link>
                  )}
                  {/* Info / Chat Details Toggle */}
                  <button
                    onClick={() => setChatDetailsOpen(!chatDetailsOpen)}
                    className={`p-2 rounded-xl border transition-colors ${
                      chatDetailsOpen
                        ? "bg-crimson border-bright-red text-white"
                        : "bg-[#141414] border-crimson/20 text-[#888] hover:text-white"
                    }`}
                    title="Chat Details & Media"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Message Stream */}
              <div
                ref={messageStreamRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 relative"
              >
                {messagesLoading && messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-6 h-6 text-bright-red animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
                    <div className="p-3 rounded-2xl bg-[#111] border border-crimson/20">
                      <MessageSquare className="w-8 h-8 text-bright-red" />
                    </div>
                    <p className="font-orbitron font-bold text-sm text-white">Start the conversation</p>
                    <p className="text-xs text-[#777] max-w-xs">
                      Send a message, share code, or upload design assets with {activeOtherMember?.displayName || "your teammate"}.
                    </p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isSelf = msg.senderId === currentUser?.id;
                    const isDeleted = msg.isDeleted;
                    const isLastSelf = isSelf && idx === messages.length - 1;

                    return (
                      <div
                        key={msg.id}
                        onDoubleClick={() => handleToggleReaction(msg.id, "❤️")}
                        className={`flex flex-col group relative ${isSelf ? "items-end" : "items-start"}`}
                      >
                        {/* Sender Name in group/channel */}
                        {!isSelf && activeConv.type !== "DIRECT" && (
                          <span className="text-[10px] font-orbitron text-[#777] mb-1 pl-1">
                            {msg.sender?.displayName || "Member"}
                          </span>
                        )}

                        {/* Reply Banner preview if this message replied to something */}
                        {msg.replyTo && (
                          <div className={`text-[10px] text-[#888] flex items-center gap-1 mb-1 px-2 py-0.5 rounded bg-black/40 border border-white/5 ${isSelf ? "mr-1" : "ml-1"}`}>
                            <Reply className="w-3 h-3 text-bright-red rotate-180" />
                            <span>Replying to <strong>{msg.replyTo.senderName}</strong>: &quot;{msg.replyTo.message}&quot;</span>
                          </div>
                        )}

                        {/* Bubble Container with Context Bar on Hover */}
                        <div className="flex items-center gap-2 group/bubble max-w-[85%] sm:max-w-[70%]">
                          {/* Left Action Menu on sent messages */}
                          {isSelf && !isDeleted && (
                            <div className="opacity-0 group-hover/bubble:opacity-100 transition-opacity flex items-center gap-1">
                              <button
                                onClick={() => setReplyingTo(msg)}
                                className="p-1 rounded bg-[#151515] hover:bg-crimson text-[#888] hover:text-white"
                                title="Reply"
                              >
                                <Reply className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingMessage(msg);
                                  setMessageText(msg.message);
                                  textareaRef.current?.focus();
                                }}
                                className="p-1 rounded bg-[#151515] hover:bg-deep-red/30 text-[#888] hover:text-white"
                                title="Edit"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleUnsendMessage(msg.id)}
                                className="p-1 rounded bg-[#151515] hover:bg-crimson text-[#888] hover:text-white"
                                title="Unsend"
                              >
                                <Trash2 className="w-3 h-3 text-bright-red" />
                              </button>
                            </div>
                          )}

                          {/* Message Bubble */}
                          <div
                            className={`p-3.5 rounded-3xl text-xs space-y-2 relative transition-all ${
                              isSelf
                                ? "bg-gradient-to-r from-crimson to-bright-red text-white shadow-[0_0_15px_rgba(217,4,41,0.25)] rounded-br-sm"
                                : "bg-[#141414] border border-white/10 text-[#EEE] rounded-bl-sm"
                            }`}
                          >
                            {/* Animated Heart Burst on Double Click */}
                            {heartAnimMessageId === msg.id && (
                              <motion.div
                                initial={{ scale: 0, opacity: 1 }}
                                animate={{ scale: 2.2, opacity: 0 }}
                                transition={{ duration: 0.8 }}
                                className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
                              >
                                <Heart className="w-10 h-10 text-white fill-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
                              </motion.div>
                            )}

                            {/* Image Attachments Grid (1 to 4 images) */}
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div
                                className={`gap-1.5 rounded-2xl overflow-hidden ${
                                  msg.attachments.length === 1
                                    ? "block"
                                    : "grid grid-cols-2"
                                }`}
                              >
                                {msg.attachments.map((att, attIdx) => (
                                  <div
                                    key={attIdx}
                                    onClick={() => setLightboxImageUrl(att.url)}
                                    className="rounded-xl overflow-hidden cursor-pointer group/img relative border border-black/20"
                                  >
                                    <img
                                      src={att.url}
                                      alt={att.name || "Chat Image"}
                                      className="max-h-56 w-full object-cover group-hover/img:scale-105 transition-transform"
                                    />
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Message Text */}
                            {isDeleted ? (
                              <p className="italic opacity-60 text-[11px]">Message unsent</p>
                            ) : (
                              msg.message && <p className="leading-relaxed whitespace-pre-line break-words">{msg.message}</p>
                            )}

                            {/* Timestamp & Edited Indicator */}
                            <div className={`flex items-center gap-1.5 text-[9px] font-mono opacity-70 ${isSelf ? "justify-end text-white/90" : "justify-start text-[#777]"}`}>
                              {msg.isEdited && <span>(edited)</span>}
                              <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                              {isSelf && (
                                <CheckCheck className={`w-3 h-3 ${msg.isSeen ? "text-cyan-300" : "text-white/90"}`} />
                              )}
                            </div>
                          </div>

                          {/* Right Action Menu on received messages */}
                          {!isSelf && !isDeleted && (
                            <div className="opacity-0 group-hover/bubble:opacity-100 transition-opacity flex items-center gap-1">
                              {REACTION_BAR_EMOJIS.slice(0, 3).map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={() => handleToggleReaction(msg.id, emoji)}
                                  className="p-1 rounded bg-[#151515] hover:scale-125 transition-transform text-xs"
                                >
                                  {emoji}
                                </button>
                              ))}
                              <button
                                onClick={() => setReplyingTo(msg)}
                                className="p-1 rounded bg-[#151515] hover:bg-crimson text-[#888] hover:text-white"
                                title="Reply"
                              >
                                <Reply className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Reactions Pill Display under Bubble */}
                        {msg.reactions && msg.reactions.length > 0 && (
                          <div className={`flex flex-wrap gap-1 mt-1 ${isSelf ? "justify-end pr-1" : "justify-start pl-1"}`}>
                            {msg.reactions.map((r, rIdx) => (
                              <button
                                key={rIdx}
                                onClick={() => handleToggleReaction(msg.id, r.emoji)}
                                className={`px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1 border transition-all ${
                                  r.userIds.includes(currentUser?.id || "")
                                    ? "bg-crimson/20 border-bright-red/50 text-white"
                                    : "bg-[#141414] border-white/10 text-[#AAA]"
                                }`}
                                title={r.userNames.join(", ")}
                              >
                                <span>{r.emoji}</span>
                                <span className="font-mono text-[9px] font-bold">{r.count}</span>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Read Receipt Seen indicator on latest sent message */}
                        {isLastSelf && activeConv.type === "DIRECT" && msg.isSeen && (
                          <span className="text-[9px] font-mono text-cyan-400/80 pr-1 mt-0.5">
                            Seen
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />

                {/* Floating "New messages ↓" button when scrolled up */}
                {showScrollBottom && (
                  <button
                    onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })}
                    className="sticky bottom-2 right-4 ml-auto px-3 py-1.5 rounded-full bg-crimson hover:bg-bright-red text-white text-[10px] font-orbitron font-bold shadow-2xl transition-all flex items-center gap-1 z-20"
                  >
                    <span>New messages</span> <ChevronDown className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Message Composer */}
              <div className="p-4 border-t border-crimson/15 bg-[#0A0A0A] space-y-3">
                
                {/* Replying Banner */}
                {replyingTo && (
                  <div className="p-2.5 rounded-2xl bg-[#141414] border border-crimson/30 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Reply className="w-3.5 h-3.5 text-bright-red" />
                      <span className="text-white">
                        Replying to <strong>{replyingTo.sender?.displayName || "Member"}</strong>: &quot;{replyingTo.message.slice(0, 40)}&quot;
                      </span>
                    </div>
                    <button onClick={() => setReplyingTo(null)} className="p-1 text-[#888] hover:text-white">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Editing Banner */}
                {editingMessage && (
                  <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-400">
                    <div className="flex items-center gap-2">
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Editing message...</span>
                    </div>
                    <button
                      onClick={() => {
                        setEditingMessage(null);
                        setMessageText("");
                      }}
                      className="p-1 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Multi-Image Attachment Preview Strip */}
                {filePreviewUrls.length > 0 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {filePreviewUrls.map((url, pIdx) => (
                      <div key={pIdx} className="relative inline-block rounded-xl overflow-hidden border border-crimson/30 flex-shrink-0">
                        <img src={url} alt={`Preview ${pIdx}`} className="h-16 w-16 object-cover" />
                        <button
                          onClick={() => handleRemoveFile(pIdx)}
                          className="absolute top-1 right-1 p-0.5 rounded-full bg-black/80 text-white hover:bg-crimson transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {filePreviewUrls.length < 4 && (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="h-16 w-16 rounded-xl border border-dashed border-crimson/30 hover:border-bright-red flex flex-col items-center justify-center text-[#777] hover:text-white transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        <span className="text-[8px] font-mono">Add</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Send Error Notice */}
                {sendError && (
                  <div className="text-[10px] text-bright-red font-mono flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {sendError}
                  </div>
                )}

                {/* Composer Input Bar */}
                <div className="flex items-center gap-2 relative">
                  
                  {/* Image Attachment Trigger */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2.5 rounded-xl bg-[#141414] hover:bg-deep-red/20 text-[#888] hover:text-white transition-colors"
                    title="Send Images (Up to 4)"
                  >
                    <ImageIcon className="w-4 h-4 text-bright-red" />
                  </button>

                  {/* Emoji Picker Trigger */}
                  <button
                    type="button"
                    onClick={() => setEmojiPickerOpen(!emojiPickerOpen)}
                    className="p-2.5 rounded-xl bg-[#141414] hover:bg-deep-red/20 text-[#888] hover:text-white transition-colors"
                    title="Insert Emoji"
                  >
                    <Smile className="w-4 h-4 text-amber-400" />
                  </button>

                  {/* Emoji Picker Popup */}
                  <AnimatePresence>
                    {emojiPickerOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute bottom-14 left-0 p-3 rounded-2xl bg-[#121212] border border-crimson/30 shadow-2xl grid grid-cols-6 gap-2 z-30"
                      >
                        {QUICK_EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => {
                              setMessageText((prev) => prev + emoji);
                              setEmojiPickerOpen(false);
                              textareaRef.current?.focus();
                            }}
                            className="p-2 hover:bg-white/10 rounded-xl text-base transition-transform hover:scale-125"
                          >
                            {emoji}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Auto-growing Textarea */}
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message... (Enter to send, Shift+Enter for newline)"
                    className="flex-1 bg-[#121212] border border-crimson/20 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-[#555] outline-none focus:border-bright-red resize-none max-h-32 transition-colors"
                  />

                  {/* Send Button */}
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={uploadingImage || (!messageText.trim() && selectedFiles.length === 0)}
                    className="p-2.5 rounded-2xl bg-crimson hover:bg-bright-red text-white disabled:opacity-40 disabled:hover:bg-crimson transition-all shadow-[0_0_15px_rgba(217,4,41,0.3)] flex-shrink-0"
                  >
                    {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* ─── CHAT DETAILS DRAWER (INFO & SHARED MEDIA) ───────────────── */}
              <AnimatePresence>
                {chatDetailsOpen && (
                  <motion.div
                    initial={{ x: "100%" }}
                    animate={{ x: 0 }}
                    exit={{ x: "100%" }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className="absolute top-0 right-0 bottom-0 w-80 bg-[#0C0C0C] border-l border-crimson/20 shadow-2xl z-30 flex flex-col justify-between p-5 space-y-4"
                  >
                    <div className="space-y-4 overflow-y-auto flex-1">
                      {/* Drawer Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-white/10">
                        <h4 className="font-orbitron font-bold text-xs text-white uppercase tracking-wider flex items-center gap-2">
                          <Info className="w-3.5 h-3.5 text-bright-red" /> Details
                        </h4>
                        <button
                          onClick={() => setChatDetailsOpen(false)}
                          className="p-1 rounded bg-[#181818] text-[#888] hover:text-white"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Participant Profile Card */}
                      {activeConv.type === "DIRECT" && activeOtherMember ? (
                        <div className="text-center space-y-2 p-3 rounded-2xl bg-[#121212] border border-white/5">
                          <div className="flex justify-center">
                            <CodeXaAvatar
                              src={activeOtherMember.mediaUrl || "/assets/images/128acbeb739b3eb8bc4d1d9ae15fcfb2.jpg"}
                              alt={activeOtherMember.displayName}
                              size="lg"
                              showGlow
                            />
                          </div>
                          <div>
                            <p className="font-orbitron font-bold text-sm text-white">{activeOtherMember.displayName}</p>
                            <p className="text-xs font-mono text-crimson">@{activeOtherMember.username}</p>
                            <p className="text-[11px] text-[#777] mt-1">{activeOtherMember.headline || activeOtherMember.role}</p>
                          </div>
                          <Link
                            href={`/team/${activeOtherMember.username}`}
                            target="_blank"
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-crimson/20 hover:bg-crimson text-white text-[10px] font-orbitron font-bold uppercase transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" /> View Profile
                          </Link>
                        </div>
                      ) : (
                        <div className="p-3 rounded-2xl bg-[#121212] border border-white/5 space-y-1">
                          <p className="font-orbitron font-bold text-sm text-white">{activeConv.title}</p>
                          <p className="text-xs text-[#777]">{activeConv.type} Discussion Channel</p>
                        </div>
                      )}

                      {/* Details Tabs: Info / Shared Media */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-white/10 pb-1 text-xs font-orbitron">
                          <span className="font-bold text-white flex items-center gap-1.5">
                            <Grid className="w-3.5 h-3.5 text-bright-red" /> Shared Media
                          </span>
                          <span className="text-[#666] font-mono text-[10px]">{sharedMediaPhotos.length} Photos</span>
                        </div>

                        {sharedMediaPhotos.length === 0 ? (
                          <p className="text-xs text-[#666] italic py-2 text-center">No media shared yet.</p>
                        ) : (
                          <div className="grid grid-cols-3 gap-1.5 max-h-56 overflow-y-auto">
                            {sharedMediaPhotos.map((photo, pIdx) => (
                              <div
                                key={pIdx}
                                onClick={() => setLightboxImageUrl(photo.url)}
                                className="aspect-square rounded-lg overflow-hidden cursor-pointer border border-white/10 hover:border-crimson transition-colors"
                              >
                                <img src={photo.url} alt={photo.name || "Media"} className="w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Actions: Delete Chat For Me */}
                    <div className="pt-3 border-t border-white/10 space-y-2">
                      <button
                        onClick={() => handleDeleteChatForMe(activeConv.id)}
                        className="w-full py-2 rounded-xl bg-deep-red/20 hover:bg-crimson border border-crimson/30 text-white text-xs font-orbitron font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-bright-red" /> Delete Chat For Me
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="p-4 rounded-3xl bg-deep-red/20 border border-crimson/30 shadow-[0_0_30px_rgba(217,4,41,0.2)]">
                <MessageSquare className="w-10 h-10 text-bright-red" />
              </div>
              <h2 className="font-orbitron font-black text-xl text-white uppercase">Your Direct Messages</h2>
              <p className="text-xs text-[#888] max-w-sm">
                Select a teammate from the left sidebar or start a new private message to collaborate in real time.
              </p>
              <button
                onClick={() => setNewMsgModalOpen(true)}
                className="px-6 py-2.5 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(217,4,41,0.3)] inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Start a Conversation
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── MODAL: START NEW DIRECT MESSAGE ──────────────────────────────── */}
      <AnimatePresence>
        {newMsgModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#0D0D0D] border border-crimson/30 rounded-3xl p-6 space-y-4 max-h-[85vh] flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h3 className="font-orbitron font-bold text-sm text-white uppercase flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-bright-red" /> New Direct Message
                </h3>
                <button onClick={() => setNewMsgModalOpen(false)} className="p-1 rounded bg-[#1A1A1A] text-[#888] hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#666] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={memberSearchQuery}
                  onChange={(e) => setMemberSearchQuery(e.target.value)}
                  placeholder="Search CodeXa teammates by name, username..."
                  className="w-full bg-[#121212] border border-crimson/20 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-[#555] outline-none focus:border-bright-red transition-colors"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 max-h-72 pr-1 divide-y divide-white/5">
                {filteredMembers.length === 0 ? (
                  <p className="text-xs text-[#777] text-center py-8">No matching teammates found.</p>
                ) : (
                  filteredMembers.map((member) => (
                    <div
                      key={member.id}
                      className="p-3 rounded-2xl hover:bg-[#151515] transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <CodeXaAvatar
                          src={member.mediaUrl || "/assets/images/128acbeb739b3eb8bc4d1d9ae15fcfb2.jpg"}
                          alt={member.displayName}
                          size="sm"
                        />
                        <div>
                          <p className="font-orbitron font-bold text-xs text-white">{member.displayName}</p>
                          <p className="text-[10px] font-mono text-crimson">@{member.username}</p>
                          {member.headline && (
                            <p className="text-[10px] text-[#777] line-clamp-1">{member.headline}</p>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleOpenDirectChatWithUser(member.id)}
                        className="px-3 py-1.5 rounded-xl bg-crimson hover:bg-bright-red text-white text-[10px] font-orbitron font-bold uppercase tracking-wider transition-all shadow-md"
                      >
                        Message
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── LIGHTBOX MODAL ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {lightboxImageUrl && (
          <div
            onClick={() => setLightboxImageUrl(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
          >
            <div className="relative max-w-4xl max-h-[90vh]">
              <img
                src={lightboxImageUrl}
                alt="Enlarged"
                className="max-h-[85vh] max-w-full rounded-2xl border border-crimson/30 shadow-2xl object-contain"
              />
              <button
                onClick={() => setLightboxImageUrl(null)}
                className="absolute top-3 right-3 p-2 rounded-full bg-black/80 text-white hover:bg-crimson transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>

    </TeamCoreShell>
  );
}

export default function MessagesChatPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#070707] text-white flex items-center justify-center font-orbitron">Loading Direct Messages...</div>}>
      <MessagesContent />
    </Suspense>
  );
}
