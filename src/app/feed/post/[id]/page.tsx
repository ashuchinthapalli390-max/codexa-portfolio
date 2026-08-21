"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Share2,
  Heart,
  MessageCircle,
  FolderGit2,
  Globe,
  ArrowUpRight,
  Check,
  Send,
  X
} from "lucide-react";
import { CyberWebOverlay } from "@/components/ui/CyberWebOverlay";
import { CodeXaAvatar } from "@/components/ui/CodeXaAvatar";
import { Post, PostComment } from "@/lib/data-store";

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params?.id as string;

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [copied, setCopied] = useState(false);
  const [activeLightbox, setActiveLightbox] = useState<string | null>(null);

  useEffect(() => {
    if (!postId) return;
    setLoading(true);

    fetch(`/api/feed/posts/${postId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.post) {
          setPost(data.post);
          setComments(data.comments || []);
        }
      })
      .finally(() => setLoading(false));
  }, [postId]);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleToggleLike = async () => {
    if (!post) return;
    const currentlyLiked = post.hasLiked;
    setPost({
      ...post,
      hasLiked: !currentlyLiked,
      likesCount: currentlyLiked ? Math.max(0, post.likesCount - 1) : post.likesCount + 1,
    });

    try {
      const res = await fetch("/api/feed/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPost((prev) => (prev ? { ...prev, hasLiked: data.hasLiked, likesCount: data.likesCount } : null));
      }
    } catch {}
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !post) return;

    try {
      const res = await fetch("/api/feed/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id, content: newComment.trim() }),
      });
      const data = await res.json();

      if (res.ok && data.success && data.comment) {
        setComments((prev) => [...prev, data.comment]);
        setPost((prev) => (prev ? { ...prev, commentsCount: prev.commentsCount + 1 } : null));
        setNewComment("");
      }
    } catch {}
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070707] text-white flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-full border-2 border-bright-red border-t-transparent animate-spin" />
        <p className="font-orbitron text-xs text-[#888] uppercase tracking-widest">Loading Post...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-[#070707] text-white flex flex-col items-center justify-center space-y-4 p-6 text-center">
        <h2 className="font-orbitron font-black text-xl text-white uppercase">Post Not Found</h2>
        <p className="text-xs text-[#888]">This post may have been removed or does not exist.</p>
        <Link href="/dashboard/feed" className="px-6 py-2.5 rounded-xl bg-crimson font-orbitron text-xs font-bold uppercase tracking-wider">
          Return to Feed
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070707] text-white relative flex flex-col">
      <CyberWebOverlay />

      {/* Header */}
      <header className="h-16 border-b border-crimson/20 bg-[#090909]/90 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/feed"
            className="p-2 rounded-xl bg-[#121212] hover:bg-deep-red/30 border border-crimson/20 text-[#888] hover:text-white transition-colors flex items-center gap-1 text-xs font-orbitron uppercase"
          >
            <ArrowLeft className="w-4 h-4" /> Feed
          </Link>
          <span className="font-orbitron font-black text-sm text-white tracking-[0.2em]">
            CODEXA <span className="text-crimson text-xs font-normal">POST DETAIL</span>
          </span>
        </div>

        <button
          onClick={handleCopyLink}
          className="p-2 rounded-xl bg-[#121212] hover:bg-deep-red/20 border border-crimson/20 text-[#888] hover:text-white transition-colors text-xs flex items-center gap-1.5 font-orbitron uppercase"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
          <span>{copied ? "Copied" : "Share"}</span>
        </button>
      </header>

      {/* Main Post Container */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 z-10">
        
        {/* Post Card */}
        <div className="rounded-3xl bg-[#0A0A0A] border border-crimson/25 p-6 sm:p-8 space-y-6 shadow-2xl">
          
          {/* Author Header */}
          <div className="flex items-center justify-between">
            <Link href={`/team/${post.author?.username}`} className="flex items-center gap-3.5 group">
              <CodeXaAvatar src={post.author?.mediaUrl} alt={post.author?.displayName} size="lg" showGlow />
              <div>
                <h3 className="font-orbitron font-black text-base text-white group-hover:text-bright-red transition-colors">
                  {post.author?.displayName}
                </h3>
                <p className="text-xs font-mono text-crimson">@{post.author?.username}</p>
              </div>
            </Link>

            <span className="text-xs font-mono text-[#666]">
              {new Date(post.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
            </span>
          </div>

          {/* Content */}
          <p className="text-sm text-[#DDD] leading-relaxed whitespace-pre-line">
            {post.content}
          </p>

          {/* Multi-Image Gallery */}
          {post.media && post.media.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {post.media.map((m, idx) => (
                <div
                  key={idx}
                  onClick={() => setActiveLightbox(m.mediaUrl)}
                  className="relative rounded-2xl overflow-hidden aspect-video border border-crimson/20 bg-[#050505] cursor-pointer group"
                >
                  <img src={m.mediaUrl} alt="Post media" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                </div>
              ))}
            </div>
          )}

          {/* Attached Project */}
          {post.project && (
            <Link
              href={`/projects/${post.project.slug}`}
              className="block p-4 rounded-2xl bg-[#111] border border-crimson/30 hover:border-bright-red transition-all group"
            >
              <span className="text-[9px] font-orbitron text-bright-red uppercase font-bold tracking-wider">
                Attached Project Build
              </span>
              <h4 className="font-orbitron font-bold text-sm text-white group-hover:text-bright-red transition-colors mt-0.5">
                {post.project.title}
              </h4>
              <p className="text-[10px] font-orbitron text-[#888] uppercase mt-1 flex items-center gap-1">
                View Project Case Study <ArrowUpRight className="w-3 h-3 text-bright-red" />
              </p>
            </Link>
          )}

          {/* Actions */}
          <div className="flex items-center gap-6 pt-4 border-t border-white/5 font-orbitron text-xs">
            <button
              onClick={handleToggleLike}
              className={`flex items-center gap-1.5 transition-colors ${
                post.hasLiked ? "text-bright-red font-bold" : "text-[#888] hover:text-white"
              }`}
            >
              <Heart className="w-4 h-4" /> {post.likesCount} Likes
            </button>
            <span className="text-[#888] flex items-center gap-1.5">
              <MessageCircle className="w-4 h-4" /> {comments.length} Comments
            </span>
          </div>

        </div>

        {/* Comments Section */}
        <div className="rounded-3xl bg-[#0A0A0A] border border-crimson/25 p-6 sm:p-8 space-y-6 shadow-2xl">
          <h3 className="font-orbitron font-bold text-sm text-white uppercase tracking-wider">
            Comments & Discussion ({comments.length})
          </h3>

          {/* Add Comment Form */}
          <form onSubmit={handleAddComment} className="flex gap-3">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              className="flex-1 bg-[#121212] border border-crimson/20 focus:border-bright-red rounded-xl px-4 py-2.5 text-xs text-white outline-none"
            />
            <button
              type="submit"
              disabled={!newComment.trim()}
              className="px-5 py-2.5 rounded-xl bg-crimson hover:bg-bright-red disabled:opacity-50 text-white text-xs font-orbitron font-bold uppercase transition-all shadow-[0_0_15px_rgba(217,4,41,0.3)] flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Comment</span>
            </button>
          </form>

          {/* Comments List */}
          <div className="space-y-3">
            {comments.length === 0 ? (
              <p className="text-center py-6 text-xs text-[#666]">No comments yet. Start the conversation!</p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="p-4 rounded-2xl bg-[#121212] border border-white/5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <Link href={`/team/${c.author?.username}`} className="font-orbitron font-bold text-white hover:text-bright-red">
                      {c.author?.displayName}
                    </Link>
                    <span className="text-[10px] font-mono text-[#666]">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-[#CCC] leading-relaxed whitespace-pre-line">{c.content}</p>
                </div>
              ))
            )}
          </div>
        </div>

      </main>

      {/* Lightbox Modal */}
      {activeLightbox && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setActiveLightbox(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img src={activeLightbox} alt="Enlarged" className="w-full h-full object-contain rounded-xl" />
            <button onClick={() => setActiveLightbox(null)} className="absolute top-3 right-3 p-2 rounded-full bg-black/70 text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
