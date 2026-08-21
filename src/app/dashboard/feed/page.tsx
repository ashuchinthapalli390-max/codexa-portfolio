"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Share2,
  Heart,
  MessageCircle,
  Image as ImageIcon,
  FolderGit2,
  Globe,
  ExternalLink,
  Plus,
  Send,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
  ArrowUpRight
} from "lucide-react";
import { TeamCoreShell } from "@/components/layout/TeamCoreShell";
import { CodeXaAvatar } from "@/components/ui/CodeXaAvatar";
import { Post, PostComment, Project, ActivityEvent } from "@/lib/data-store";

export default function SocialFeedPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [myProjects, setMyProjects] = useState<Project[]>([]);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Composer state
  const [newPostText, setNewPostText] = useState("");
  const [postImageUrl, setPostImageUrl] = useState("");
  const [showImageInput, setShowImageInput] = useState(false);
  const [postLinkUrl, setPostLinkUrl] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkPreview, setLinkPreview] = useState<any>(null);
  const [loadingLinkPreview, setLoadingLinkPreview] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [showProjectSelect, setShowProjectSelect] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Comments state
  const [openCommentsPostId, setOpenCommentsPostId] = useState<string | null>(null);
  const [postCommentsMap, setPostCommentsMap] = useState<{ [postId: string]: PostComment[] }>({});
  const [commentInputs, setCommentInputs] = useState<{ [postId: string]: string }>({});

  useEffect(() => {
    fetch("/api/session")
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setCurrentUser(data.user);
          loadFeedData(data.user);
        }
      })
      .catch(() => {});
  }, []);

  const loadFeedData = (user: any) => {
    setLoading(true);
    Promise.all([
      fetch("/api/feed/posts").then((r) => r.json()).catch(() => ({ posts: [] })),
      fetch(`/api/projects?developerId=${user.id}`).then((r) => r.json()).catch(() => ({ projects: [] })),
      fetch("/api/activity").then((r) => r.json()).catch(() => ({ activities: [] })),
    ])
      .then(([feedRes, projRes, actRes]) => {
        if (feedRes.posts) setPosts(feedRes.posts);
        if (projRes.projects) setMyProjects(projRes.projects);
        if (actRes.activities) setActivities(actRes.activities);
      })
      .finally(() => setLoading(false));
  };

  // Generate Link Preview
  const handleFetchLinkPreview = async (url: string) => {
    if (!url || !url.startsWith("http")) return;
    setLoadingLinkPreview(true);
    try {
      const res = await fetch("/api/feed/link-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (data.success && data.preview) {
        setLinkPreview(data.preview);
      }
    } catch {
      // ignore
    } finally {
      setLoadingLinkPreview(false);
    }
  };

  // Create New Post
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostText.trim() && !postImageUrl && !postLinkUrl && !selectedProjectId) return;

    setIsPublishing(true);
    try {
      const mediaArray = postImageUrl.trim()
        ? [{ id: `med-${Date.now()}`, mediaUrl: postImageUrl.trim(), mediaType: "image/jpeg" }]
        : [];

      const res = await fetch("/api/feed/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newPostText.trim(),
          projectId: selectedProjectId || null,
          media: mediaArray,
          linkUrl: postLinkUrl.trim() || null,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success && data.post) {
        setPosts((prev) => [data.post, ...prev]);
        setNewPostText("");
        setPostImageUrl("");
        setShowImageInput(false);
        setPostLinkUrl("");
        setShowLinkInput(false);
        setLinkPreview(null);
        setSelectedProjectId("");
        setShowProjectSelect(false);
      }
    } catch {
      alert("Failed to publish post.");
    } finally {
      setIsPublishing(false);
    }
  };

  // Toggle Like (1 like per user)
  const handleToggleLike = async (postId: string) => {
    // Optimistic UI update
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const currentlyLiked = p.hasLiked;
          return {
            ...p,
            hasLiked: !currentlyLiked,
            likesCount: currentlyLiked ? Math.max(0, p.likesCount - 1) : p.likesCount + 1,
          };
        }
        return p;
      })
    );

    try {
      const res = await fetch("/api/feed/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, hasLiked: data.hasLiked, likesCount: data.likesCount } : p))
        );
      }
    } catch {
      // rollback on failure
      loadFeedData(currentUser);
    }
  };

  // Load Comments for Post
  const handleToggleComments = async (postId: string) => {
    if (openCommentsPostId === postId) {
      setOpenCommentsPostId(null);
      return;
    }

    setOpenCommentsPostId(postId);
    try {
      const res = await fetch(`/api/feed/posts/${postId}`);
      const data = await res.json();
      if (data.success && data.comments) {
        setPostCommentsMap((prev) => ({ ...prev, [postId]: data.comments }));
      }
    } catch {}
  };

  // Post Comment
  const handleAddComment = async (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text) return;

    try {
      const res = await fetch("/api/feed/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, content: text }),
      });
      const data = await res.json();

      if (res.ok && data.success && data.comment) {
        setPostCommentsMap((prev) => ({
          ...prev,
          [postId]: [...(prev[postId] || []), data.comment],
        }));
        setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p))
        );
      }
    } catch {}
  };

  // Delete Post
  const handleDeletePost = async (postId: string) => {
    if (!confirm("Are you sure you want to remove this post?")) return;
    try {
      const res = await fetch(`/api/feed/posts/${postId}`, { method: "DELETE" });
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
      }
    } catch {}
  };

  return (
    <TeamCoreShell
      title="Team Core Social Feed"
      subtitle="Private Developer Network & Milestones"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* ─── CENTER COLUMN: POST COMPOSER & FEED STREAM (8 Cols) ─────────── */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Post Composer Card */}
          <form onSubmit={handleCreatePost} className="p-5 rounded-3xl bg-[#0A0A0A] border border-crimson/25 space-y-4 shadow-xl">
            <div className="flex items-start gap-3">
              <CodeXaAvatar src={currentUser?.mediaUrl} size="md" showGlow />
              <textarea
                rows={3}
                value={newPostText}
                onChange={(e) => setNewPostText(e.target.value)}
                placeholder="Share a milestone, code achievement, or architecture update with CodeXa..."
                className="flex-1 bg-[#121212] border border-crimson/20 rounded-2xl p-3.5 text-xs text-white placeholder-[#555] outline-none resize-none focus:border-bright-red transition-colors"
              />
            </div>

            {/* Optional Image Input */}
            {showImageInput && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={postImageUrl}
                  onChange={(e) => setPostImageUrl(e.target.value)}
                  placeholder="Paste image URL or /assets/pfp/..."
                  className="flex-1 bg-[#121212] border border-crimson/20 rounded-xl px-3 py-2 text-xs text-white outline-none"
                />
                <button type="button" onClick={() => setShowImageInput(false)} className="p-2 text-[#777] hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Optional Link Input & Preview */}
            {showLinkInput && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={postLinkUrl}
                    onChange={(e) => {
                      setPostLinkUrl(e.target.value);
                      handleFetchLinkPreview(e.target.value);
                    }}
                    placeholder="Paste website or GitHub URL (https://...)"
                    className="flex-1 bg-[#121212] border border-crimson/20 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />
                  <button type="button" onClick={() => { setShowLinkInput(false); setLinkPreview(null); }} className="p-2 text-[#777] hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {linkPreview && (
                  <div className="p-3 rounded-xl bg-[#141414] border border-white/10 flex items-center gap-3">
                    <Globe className="w-4 h-4 text-bright-red flex-shrink-0" />
                    <div className="text-xs text-white truncate">
                      <p className="font-bold">{linkPreview.title}</p>
                      <p className="text-[10px] text-[#888]">{linkPreview.domain}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Optional Project Select */}
            {showProjectSelect && (
              <div className="flex gap-2">
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="flex-1 bg-[#121212] border border-crimson/20 rounded-xl px-3 py-2 text-xs text-white outline-none"
                >
                  <option value="">Select Project Build...</option>
                  {myProjects.map((proj) => (
                    <option key={proj.id} value={proj.id}>{proj.title}</option>
                  ))}
                </select>
                <button type="button" onClick={() => { setShowProjectSelect(false); setSelectedProjectId(""); }} className="p-2 text-[#777] hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowImageInput(!showImageInput)}
                  className={`p-2 rounded-xl text-xs font-orbitron flex items-center gap-1.5 transition-colors ${
                    showImageInput ? "bg-crimson text-white" : "bg-[#141414] text-[#888] hover:text-white"
                  }`}
                  title="Add Image"
                >
                  <ImageIcon className="w-4 h-4" />
                  <span className="hidden sm:inline text-[10px] uppercase">Image</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowLinkInput(!showLinkInput)}
                  className={`p-2 rounded-xl text-xs font-orbitron flex items-center gap-1.5 transition-colors ${
                    showLinkInput ? "bg-crimson text-white" : "bg-[#141414] text-[#888] hover:text-white"
                  }`}
                  title="Share Link"
                >
                  <Globe className="w-4 h-4" />
                  <span className="hidden sm:inline text-[10px] uppercase">Link</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowProjectSelect(!showProjectSelect)}
                  className={`p-2 rounded-xl text-xs font-orbitron flex items-center gap-1.5 transition-colors ${
                    showProjectSelect ? "bg-crimson text-white" : "bg-[#141414] text-[#888] hover:text-white"
                  }`}
                  title="Attach Project"
                >
                  <FolderGit2 className="w-4 h-4" />
                  <span className="hidden sm:inline text-[10px] uppercase">Project</span>
                </button>
              </div>

              <button
                type="submit"
                disabled={isPublishing || (!newPostText.trim() && !postImageUrl && !postLinkUrl && !selectedProjectId)}
                className="px-5 py-2 rounded-xl bg-crimson hover:bg-bright-red disabled:opacity-50 text-white text-xs font-orbitron font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(217,4,41,0.3)] flex items-center gap-1.5"
              >
                {isPublishing ? "Publishing..." : "Publish Update"}
              </button>
            </div>
          </form>

          {/* Posts Feed Stream */}
          <div className="space-y-5">
            {loading ? (
              [1, 2, 3].map((n) => (
                <div key={n} className="h-44 rounded-3xl bg-[#0A0A0A] animate-pulse border border-white/5" />
              ))
            ) : posts.length === 0 ? (
              <div className="p-12 rounded-3xl bg-[#0A0A0A] border border-white/5 text-center space-y-2">
                <Share2 className="w-8 h-8 text-[#555] mx-auto" />
                <h4 className="font-orbitron font-bold text-xs text-[#AAA] uppercase">No posts in feed yet</h4>
                <p className="text-xs text-[#666]">Be the first to share an architecture update or milestone.</p>
              </div>
            ) : (
              posts.map((post) => (
                <div
                  key={post.id}
                  className="rounded-3xl bg-[#0A0A0A] border border-crimson/20 hover:border-crimson/40 p-6 space-y-4 shadow-xl transition-all"
                >
                  {/* Post Author Header */}
                  <div className="flex items-center justify-between">
                    <Link href={`/team/${post.author?.username}`} className="flex items-center gap-3 group">
                      <CodeXaAvatar src={post.author?.mediaUrl} alt={post.author?.displayName} size="md" showGlow />
                      <div>
                        <p className="font-orbitron font-bold text-sm text-white group-hover:text-bright-red transition-colors leading-tight">
                          {post.author?.displayName}
                        </p>
                        <span className="text-[10px] font-mono text-crimson">@{post.author?.username}</span>
                      </div>
                    </Link>

                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono text-[#666]">
                        {new Date(post.createdAt).toLocaleDateString()}
                      </span>
                      {(post.authorId === currentUser?.id || currentUser?.role === "OWNER" || currentUser?.role === "ADMIN") && (
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          className="p-1 text-[#666] hover:text-red-500 transition-colors"
                          title="Delete Post"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Text Content */}
                  <p className="text-xs text-[#DDD] leading-relaxed whitespace-pre-line">
                    {post.content}
                  </p>

                  {/* Multi-Image Carousel / Grid */}
                  {post.media && post.media.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {post.media.map((m, idx) => (
                        <div key={idx} className="relative rounded-2xl overflow-hidden aspect-video border border-crimson/20 bg-[#050505]">
                          <img src={m.mediaUrl} alt="Post media" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Attached Project Relation Card */}
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

                  {/* Social Action Footer: Like, Comment */}
                  <div className="flex items-center gap-6 pt-3 border-t border-white/5 text-xs font-orbitron">
                    <button
                      onClick={() => handleToggleLike(post.id)}
                      className={`flex items-center gap-1.5 transition-colors ${
                        post.hasLiked ? "text-bright-red font-bold" : "text-[#888] hover:text-white"
                      }`}
                    >
                      <Heart className="w-4 h-4" />
                      <span>{post.likesCount}</span>
                    </button>

                    <button
                      onClick={() => handleToggleComments(post.id)}
                      className="text-[#888] hover:text-white flex items-center gap-1.5 transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>{post.commentsCount} Comments</span>
                    </button>
                  </div>

                  {/* Comments Thread Accordion */}
                  <AnimatePresence>
                    {openCommentsPostId === post.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="pt-3 border-t border-white/5 space-y-3"
                      >
                        <div className="space-y-2">
                          {(postCommentsMap[post.id] || []).map((c) => (
                            <div key={c.id} className="p-3 rounded-xl bg-[#121212] border border-white/5 space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <Link href={`/team/${c.author?.username}`} className="font-orbitron font-bold text-white hover:text-bright-red">
                                  {c.author?.displayName}
                                </Link>
                                <span className="text-[10px] font-mono text-[#666]">
                                  {new Date(c.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-xs text-[#CCC] leading-relaxed">{c.content}</p>
                            </div>
                          ))}
                        </div>

                        {/* Comment Input */}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={commentInputs[post.id] || ""}
                            onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                            placeholder="Write a comment or reply..."
                            className="flex-1 bg-[#141414] border border-crimson/20 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-bright-red"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddComment(post.id)}
                            className="px-4 py-2 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-bold uppercase transition-all"
                          >
                            Send
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                </div>
              ))
            )}
          </div>

        </div>

        {/* ─── RIGHT COLUMN: RECENT UPDATES & SPOTLIGHT (4 Cols) ───────────── */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Recent Real Activity Events Feed */}
          <div className="p-5 rounded-3xl bg-[#0A0A0A] border border-crimson/25 space-y-4 shadow-xl">
            <h3 className="font-orbitron font-bold text-xs text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-bright-red" /> Activity Pulse
            </h3>

            <div className="space-y-3">
              {activities.slice(0, 5).map((act) => (
                <div key={act.id} className="p-3 rounded-xl bg-[#121212] border border-white/5 space-y-1 text-xs">
                  <p className="font-orbitron font-bold text-white text-[11px]">{act.title}</p>
                  {act.details && <p className="text-[#888] text-[11px] line-clamp-2">{act.details}</p>}
                  <span className="text-[9px] font-mono text-crimson block pt-0.5">
                    {new Date(act.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="p-5 rounded-3xl bg-[#0A0A0A] border border-crimson/25 space-y-3">
            <h4 className="font-orbitron font-bold text-xs text-white uppercase tracking-wider">
              Quick Shortcuts
            </h4>
            <div className="space-y-2 text-xs font-orbitron">
              <Link href="/team" className="block p-2.5 rounded-xl bg-[#141414] hover:bg-deep-red/20 text-[#AAA] hover:text-white transition-colors">
                &bull; Explore Team Directory
              </Link>
              <Link href="/dashboard/projects" className="block p-2.5 rounded-xl bg-[#141414] hover:bg-deep-red/20 text-[#AAA] hover:text-white transition-colors">
                &bull; Create New Project Build
              </Link>
              <Link href="/dashboard/profile" className="block p-2.5 rounded-xl bg-[#141414] hover:bg-deep-red/20 text-[#AAA] hover:text-white transition-colors">
                &bull; Edit My Digital Identity
              </Link>
            </div>
          </div>

        </div>

      </div>
    </TeamCoreShell>
  );
}
