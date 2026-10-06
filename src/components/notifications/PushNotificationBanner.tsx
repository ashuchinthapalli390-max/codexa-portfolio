"use client";

import React, { useState, useEffect } from "react";
import { Bell, Check, X, ShieldAlert } from "lucide-react";

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

export function PushNotificationBanner() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in window)) {
      setPermission("unsupported");
      return;
    }

    setPermission(Notification.permission);

    const isDismissed = localStorage.getItem("cxa_push_dismissed") === "true";
    if (Notification.permission === "default" && !isDismissed) {
      setDismissed(false);
    }
  }, []);

  const handleEnablePush = async () => {
    try {
      setLoading(true);
      setStatusMessage(null);

      // 1. Request permission upon explicit user click
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== "granted") {
        setStatusMessage("Notifications declined. Reminders will continue to arrive via Email.");
        setTimeout(() => setDismissed(true), 3500);
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
        return;
      }

      // 4. Subscribe with pushManager
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // 5. Send to server
      const saveRes = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });

      if (saveRes.ok) {
        setStatusMessage("Notifications enabled! You will receive reminders here.");
        setTimeout(() => setDismissed(true), 2500);
      } else {
        setStatusMessage("Registered in browser, but server sync failed.");
      }
    } catch (err: any) {
      console.error("Push registration error:", err);
      setStatusMessage("Failed to enable browser notifications.");
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem("cxa_push_dismissed", "true");
    } catch {}
  };

  if (dismissed || permission === "granted" || permission === "unsupported") {
    return null;
  }

  return (
    <div className="p-4 rounded-2xl bg-gradient-to-r from-[#170909] to-[#121214] border border-bright-red/30 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-start sm:items-center gap-3">
        <div className="p-2.5 rounded-xl bg-bright-red/20 border border-bright-red/30 text-bright-red shrink-0">
          <Bell className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xs font-bold text-white flex items-center gap-2">
            <span>Stay Updated</span>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-bright-red/20 text-bright-red border border-bright-red/30">
              Web Push
            </span>
          </div>
          <p className="text-xs text-zinc-300 mt-0.5">
            Enable notifications to receive important internship updates and mandatory payment reminders.
          </p>
          {statusMessage && (
            <p className="text-[11px] text-amber-400 mt-1">{statusMessage}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
        <button
          onClick={handleEnablePush}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-bright-red hover:bg-bright-red/90 text-white text-xs font-bold shadow-[0_0_12px_rgba(239,35,60,0.3)] transition-all disabled:opacity-50"
        >
          {loading ? "Enabling..." : "Enable Notifications"}
        </button>
        <button
          onClick={handleDismiss}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
