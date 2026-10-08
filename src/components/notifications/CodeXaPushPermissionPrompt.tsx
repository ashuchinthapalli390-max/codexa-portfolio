"use client";

import React, { useState, useEffect } from "react";
import { Bell, Check, X, ShieldAlert, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function CodeXaPushPermissionPrompt() {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check browser support
    const hasNotification = "Notification" in window;
    const hasSW = "serviceWorker" in navigator;
    const hasPush = "PushManager" in window;

    if (!hasNotification || !hasSW || !hasPush) {
      setIsSupported(false);
      return;
    }

    // If permission already granted or denied, don't show prompt
    if (Notification.permission === "granted" || Notification.permission === "denied") {
      return;
    }

    // Check cooldown in localStorage (7 days)
    const dismissedUntil = localStorage.getItem("codexa_push_prompt_dismissed_until");
    if (dismissedUntil && Number(dismissedUntil) > Date.now()) {
      return;
    }

    // Small delay after page ready so it doesn't interrupt initial render
    const timer = setTimeout(() => {
      setVisible(true);
    }, 1800);

    return () => clearTimeout(timer);
  }, []);

  const handleEnableNotifications = async () => {
    try {
      setLoading(true);
      setStatusMessage(null);

      // 1. User gesture: request permission
      const perm = await Notification.requestPermission();

      if (perm !== "granted") {
        setStatusMessage(
          perm === "denied"
            ? "Notifications blocked in browser. You can enable them in browser settings."
            : "Permission dismissed."
        );
        setTimeout(() => setVisible(false), 3000);
        return;
      }

      // 2. Register service worker
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;

      // 3. Get VAPID public key
      const keyRes = await fetch("/api/push/subscribe");
      const { publicKey } = await keyRes.json();

      if (!publicKey) {
        setStatusMessage("Push notification service not configured on server.");
        setTimeout(() => setVisible(false), 3000);
        return;
      }

      // 4. Subscribe through PushManager
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // 5. Store subscription on authenticated backend API
      const saveRes = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });

      if (saveRes.ok) {
        setIsSuccess(true);
        setStatusMessage("Notifications enabled! You'll receive real-time CodeXa updates.");
        localStorage.removeItem("codexa_push_prompt_dismissed_until");
        setTimeout(() => setVisible(false), 2800);
      } else {
        setStatusMessage("Browser permitted, but server registration failed. Please retry.");
      }
    } catch (err: any) {
      console.error("Push registration error:", err);
      setStatusMessage(err.message || "Could not register push notifications.");
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    // 7-day cooldown
    try {
      const sevenDays = Date.now() + 7 * 24 * 60 * 60 * 1000;
      localStorage.setItem("codexa_push_prompt_dismissed_until", sevenDays.toString());
    } catch {}
  };

  if (!visible || !isSupported) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.3 }}
        className="fixed bottom-5 right-5 left-5 sm:left-auto sm:max-w-md z-50 p-5 rounded-2xl bg-[#0c0c0e]/95 backdrop-blur-xl border border-crimson/30 shadow-[0_10px_35px_rgba(0,0,0,0.8),0_0_20px_rgba(217,4,41,0.15)] text-left"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-crimson/20 border border-crimson/40 text-bright-red flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-orbitron font-bold text-xs text-white uppercase tracking-wider">
                  Stay updated with CodeXa
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-crimson/20 text-bright-red uppercase">
                  Alerts
                </span>
              </div>
              <p className="text-[11px] text-zinc-300 mt-1 leading-snug">
                Receive notifications for messages, attendance, classes, assignments, payment updates, and important announcements.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors shrink-0"
            title="Dismiss for now"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {statusMessage && (
          <div
            className={`mt-3 p-2.5 rounded-xl text-xs font-mono flex items-center gap-2 ${
              isSuccess
                ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-300"
                : "bg-amber-500/15 border border-amber-500/30 text-amber-300"
            }`}
          >
            {isSuccess ? <Check className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
            <span className="text-[11px]">{statusMessage}</span>
          </div>
        )}

        {!isSuccess && (
          <div className="mt-4 flex items-center justify-end gap-2.5 pt-2 border-t border-white/5">
            <button
              type="button"
              onClick={handleDismiss}
              className="px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              NOT NOW
            </button>
            <button
              type="button"
              onClick={handleEnableNotifications}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-crimson to-bright-red hover:brightness-110 text-white text-xs font-orbitron font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(217,4,41,0.3)] disabled:opacity-50 flex items-center gap-1.5"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>ENABLING...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>ENABLE NOTIFICATIONS</span>
                </>
              )}
            </button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
