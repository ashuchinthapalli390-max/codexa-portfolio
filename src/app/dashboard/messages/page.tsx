"use client";

import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  Send,
  User,
  Users,
  Search,
  Check,
  Smile
} from "lucide-react";
import { TeamCoreShell } from "@/components/layout/TeamCoreShell";
import { CodeXaAvatar } from "@/components/ui/CodeXaAvatar";
import { Conversation, ChatMessage, Profile } from "@/lib/data-store";

export default function MessagesChatPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessageText, setNewMessageText] = useState("");
  const [teamMembers, setTeamMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/session")
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setCurrentUser(data.user);
          loadChatData();
        }
      })
      .catch(() => {});
  }, []);

  const loadChatData = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/chat/conversations").then((r) => r.json()).catch(() => ({ conversations: [] })),
      fetch("/api/team/public").then((r) => r.json()).catch(() => ({ profiles: [] })),
    ])
      .then(([convRes, teamRes]) => {
        if (convRes.conversations) {
          setConversations(convRes.conversations);
          if (convRes.conversations.length > 0 && !activeConvId) {
            setActiveConvId(convRes.conversations[0].id);
            loadMessages(convRes.conversations[0].id);
          }
        }
        if (teamRes.profiles) setTeamMembers(teamRes.profiles);
      })
      .finally(() => setLoading(false));
  };

  const loadMessages = (convId: string) => {
    fetch(`/api/chat/messages?conversationId=${convId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.messages) setMessages(data.messages);
      })
      .catch(() => {});
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || !activeConvId) return;

    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeConvId,
          message: newMessageText.trim(),
        }),
      });
      const data = await res.json();

      if (res.ok && data.success && data.message) {
        setMessages((prev) => [...prev, data.message]);
        setNewMessageText("");
      }
    } catch {}
  };

  const activeConv = conversations.find((c) => c.id === activeConvId);

  return (
    <TeamCoreShell
      title="Team Messages & Chat"
      subtitle="Encrypted Internal Communications"
    >
      <div className="h-[75vh] rounded-3xl bg-[#0A0A0A] border border-crimson/25 overflow-hidden flex flex-col md:flex-row shadow-2xl">
        
        {/* Left: Conversation Channels List (w-72) */}
        <div className="w-full md:w-80 border-r border-crimson/15 flex flex-col justify-between bg-[#080808]">
          <div className="p-4 border-b border-white/5">
            <span className="font-orbitron font-bold text-xs text-white uppercase tracking-wider block">
              Channels & Direct Messages
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {conversations.length === 0 ? (
              <p className="p-4 text-center text-xs text-[#666]">No conversations yet.</p>
            ) : (
              conversations.map((conv) => {
                const isActive = conv.id === activeConvId;
                return (
                  <button
                    key={conv.id}
                    onClick={() => {
                      setActiveConvId(conv.id);
                      loadMessages(conv.id);
                    }}
                    className={`w-full p-3 rounded-2xl text-left flex items-center gap-3 transition-all ${
                      isActive ? "bg-crimson text-white shadow-md" : "hover:bg-[#141414] text-[#AAA]"
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-[#111] flex items-center justify-center font-orbitron font-bold text-xs">
                      {conv.title?.charAt(0) || "C"}
                    </div>
                    <div className="flex-1 truncate">
                      <p className="font-orbitron font-bold text-xs text-white truncate">{conv.title}</p>
                      <p className="text-[10px] text-[#888] truncate">{conv.lastMessage?.message || "Active room"}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Active Chat Messages & Composer */}
        <div className="flex-1 flex flex-col justify-between bg-[#070707]">
          
          {/* Header */}
          <div className="p-4 border-b border-crimson/15 bg-[#090909] flex items-center justify-between">
            <h3 className="font-orbitron font-bold text-xs text-white uppercase">
              {activeConv?.title || "Team Discussion"}
            </h3>
            <span className="text-[10px] font-mono text-emerald-400">&bull; Secure Chat</span>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-2 text-xs text-[#666]">
                <MessageSquare className="w-8 h-8 text-[#444]" />
                <p>No messages in this channel yet. Say hello!</p>
              </div>
            ) : (
              messages.map((m) => {
                const isMe = m.senderId === currentUser?.id;
                return (
                  <div key={m.id} className={`flex gap-3 ${isMe ? "justify-end" : "justify-start"}`}>
                    {!isMe && <CodeXaAvatar src={m.sender?.mediaUrl} size="xs" />}
                    <div
                      className={`max-w-md p-3.5 rounded-2xl text-xs space-y-1 shadow-md ${
                        isMe
                          ? "bg-crimson text-white rounded-br-none"
                          : "bg-[#141414] border border-white/10 text-[#DDD] rounded-bl-none"
                      }`}
                    >
                      {!isMe && (
                        <p className="font-orbitron font-bold text-[10px] text-bright-red">
                          {m.sender?.displayName || "Member"}
                        </p>
                      )}
                      <p className="leading-relaxed whitespace-pre-line">{m.message}</p>
                      <span className="text-[9px] font-mono opacity-60 block text-right">
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Composer */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-crimson/15 bg-[#090909] flex gap-3">
            <input
              type="text"
              value={newMessageText}
              onChange={(e) => setNewMessageText(e.target.value)}
              placeholder="Type message to team..."
              className="flex-1 bg-[#121212] border border-crimson/20 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-bright-red"
            />
            <button
              type="submit"
              disabled={!newMessageText.trim()}
              className="px-5 py-2.5 rounded-xl bg-crimson hover:bg-bright-red disabled:opacity-50 text-white text-xs font-orbitron font-bold uppercase transition-all shadow-[0_0_15px_rgba(217,4,41,0.3)] flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>

        </div>

      </div>
    </TeamCoreShell>
  );
}
