"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  Shield,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Plus,
  Search,
  Filter,
  Eye,
  CreditCard,
  Smartphone,
  QrCode,
  TrendingUp,
  FileText,
  DollarSign,
  Clock,
  Layers,
  ArrowRight,
} from "lucide-react";

export function FounderPaymentSettingsTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Settings State
  const [receiverName, setReceiverName] = useState("CodeXa Agency");
  const [upiId, setUpiId] = useState("shaikashu33@fam");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [fixedAmount, setFixedAmount] = useState(450);
  const [phonePeEnabled, setPhonePeEnabled] = useState(true);
  const [googlePayEnabled, setGooglePayEnabled] = useState(true);
  const [paytmEnabled, setPaytmEnabled] = useState(true);
  const [otherUpiEnabled, setOtherUpiEnabled] = useState(true);
  const [proofWindowMinutes, setProofWindowMinutes] = useState(5);
  const [clockToleranceSeconds, setClockToleranceSeconds] = useState(60);
  const [systemEnabled, setSystemEnabled] = useState(true);
  const [paymentInstructions, setPaymentInstructions] = useState(
    "Scan the QR code or tap your preferred UPI app. Pay exactly ₹450 and upload your transaction screenshot with UTR within 5 minutes."
  );

  // Amount Change Confirmation Modal
  const [showAmountModal, setShowAmountModal] = useState(false);
  const [tentativeAmount, setTentativeAmount] = useState<number>(450);

  // Test Bank Feed Transaction Ingestion State
  const [testUtr, setTestUtr] = useState("");
  const [testAmount, setTestAmount] = useState(450);
  const [testSender, setTestSender] = useState("Intern Account");
  const [ingestingTx, setIngestingTx] = useState(false);
  const [ingestSuccess, setIngestSuccess] = useState<string | null>(null);
  const [recentTrustedTx, setRecentTrustedTx] = useState<any[]>([]);

  // Fetch Settings
  const fetchSettings = async () => {
    try {
      setLoading(true);
      setMessage(null);
      const res = await fetch("/api/admin/payment-settings");
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to load payment configuration");
      }
      const data = await res.json();
      const s = data.settings;
      setReceiverName(s.receiverName || s.upiDisplayName || "CodeXa Agency");
      setUpiId(s.upiId || s.defaultUpiId || "shaikashu33@fam");
      setQrCodeUrl(s.qrCodeUrl || "");
      setFixedAmount(Number(s.fixedInternshipAmount || 450));
      setTentativeAmount(Number(s.fixedInternshipAmount || 450));
      setPhonePeEnabled(s.phonePeEnabled ?? true);
      setGooglePayEnabled(s.googlePayEnabled ?? true);
      setPaytmEnabled(s.paytmEnabled ?? true);
      setOtherUpiEnabled(s.otherUpiEnabled ?? true);
      setProofWindowMinutes(s.proofWindowMinutes ?? 5);
      setClockToleranceSeconds(s.clockToleranceSeconds ?? 60);
      setSystemEnabled(s.systemEnabled ?? true);
      setPaymentInstructions(s.paymentInstructions || "");

      if (data.trustedFeedStats?.recent) {
        setRecentTrustedTx(data.trustedFeedStats.recent);
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Save Settings
  const handleSaveSettings = async (amountToSave = fixedAmount) => {
    try {
      setSaving(true);
      setMessage(null);
      const res = await fetch("/api/admin/payment-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverName,
          upiId,
          qrCodeUrl: qrCodeUrl || null,
          fixedInternshipAmount: amountToSave,
          phonePeEnabled,
          googlePayEnabled,
          paytmEnabled,
          otherUpiEnabled,
          proofWindowMinutes,
          clockToleranceSeconds,
          systemEnabled,
          paymentInstructions,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update settings");
      }

      setFixedAmount(amountToSave);
      setMessage({ type: "success", text: "Payment settings saved successfully!" });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
      setShowAmountModal(false);
    }
  };

  // Ingest Test Bank Settlement Record
  const handleIngestTestTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testUtr.trim()) return;

    try {
      setIngestingTx(true);
      setIngestSuccess(null);
      const res = await fetch("/api/admin/payment-settings/trusted-transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          utrNumber: testUtr.trim(),
          amount: testAmount,
          receiverUpi: upiId,
          senderName: testSender,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to ingest bank transaction");
      }

      setIngestSuccess(`Transaction ${data.transaction.utrNumber} registered! Interns with this UTR can now automatically verify.`);
      setTestUtr("");
      fetchSettings();
    } catch (err: any) {
      alert(`Ingestion error: ${err.message}`);
    } finally {
      setIngestingTx(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center rounded-3xl bg-[#0d0d0d] border border-white/5 space-y-3">
        <RefreshCw className="w-8 h-8 text-bright-red animate-spin mx-auto" />
        <p className="font-mono text-xs text-zinc-400">Loading Founder payment control center...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-[#0d0d0d] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase font-mono">
              Founder & Co-Founder Control
            </span>
          </div>
          <h2 className="text-xl font-orbitron font-bold text-white mt-1">
            Payment Destination & Automation Settings
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Configure authoritative UPI accounts, timers, app availability, and test settlement reconciliation.
          </p>
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={() => {
            if (tentativeAmount !== fixedAmount) {
              setShowAmountModal(true);
            } else {
              handleSaveSettings();
            }
          }}
          className="px-5 py-2.5 rounded-xl bg-crimson hover:bg-bright-red text-white font-orbitron font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-2 self-start sm:self-auto disabled:opacity-50"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>Save Changes</span>
        </button>
      </div>

      {message && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center gap-2.5 ${
            message.type === "success"
              ? "bg-emerald-950/20 border-emerald-500/40 text-emerald-400"
              : "bg-rose-950/20 border-rose-500/40 text-rose-400"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Main Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Receiver & UPI Destination */}
        <div className="p-6 rounded-3xl bg-[#0d0d0d] border border-white/10 space-y-5">
          <h3 className="text-sm font-orbitron font-bold text-white flex items-center gap-2 uppercase">
            <CreditCard className="w-4 h-4 text-bright-red" />
            1. Receiver UPI Destination
          </h3>

          <div className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-zinc-300 block">UPI Receiver Display Name</label>
              <input
                type="text"
                value={receiverName}
                onChange={(e) => setReceiverName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#141414] border border-white/10 text-white font-medium focus:outline-none focus:border-bright-red"
              />
              <span className="text-[10px] text-zinc-500 block">Displayed as payee name in UPI apps</span>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-zinc-300 block">Official UPI ID (VPA)</label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#141414] border border-white/10 text-white font-mono focus:outline-none focus:border-bright-red"
              />
              <span className="text-[10px] text-zinc-500 block">All intern UPI intents route to this VPA</span>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-zinc-300 block">Custom QR Code Image URL (Optional)</label>
              <input
                type="text"
                value={qrCodeUrl}
                onChange={(e) => setQrCodeUrl(e.target.value)}
                placeholder="Leave blank to use dynamically generated vector QR"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#141414] border border-white/10 text-white focus:outline-none focus:border-bright-red"
              />
            </div>

            {/* Fixed Internship Amount */}
            <div className="p-4 rounded-2xl bg-[#141414] border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">Fixed Internship Amount (₹)</span>
                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-mono text-[10px] uppercase font-bold">
                  Requires Confirmation
                </span>
              </div>
              <input
                type="number"
                min="1"
                step="1"
                value={tentativeAmount}
                onChange={(e) => setTentativeAmount(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#181818] border border-white/10 text-white font-mono text-base font-bold focus:outline-none focus:border-bright-red"
              />
              <p className="text-[11px] text-zinc-400">
                Default: <strong>₹450</strong>. Modifying this applies only to newly initiated sessions; active attempts retain their snapshot.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: App Switches & Timer Limits */}
        <div className="p-6 rounded-3xl bg-[#0d0d0d] border border-white/10 space-y-5">
          <h3 className="text-sm font-orbitron font-bold text-white flex items-center gap-2 uppercase">
            <Smartphone className="w-4 h-4 text-bright-red" />
            2. App Toggles & Session Deadlines
          </h3>

          <div className="space-y-4 text-xs">
            {/* Payment App Toggles */}
            <div className="space-y-2">
              <label className="font-semibold text-zinc-300 block">Available UPI Methods for Interns</label>
              <div className="grid grid-cols-2 gap-2.5">
                <label className="flex items-center gap-2 p-3 rounded-xl bg-[#141414] border border-white/5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={phonePeEnabled}
                    onChange={(e) => setPhonePeEnabled(e.target.checked)}
                    className="accent-crimson rounded"
                  />
                  <span className="text-zinc-200">PhonePe</span>
                </label>
                <label className="flex items-center gap-2 p-3 rounded-xl bg-[#141414] border border-white/5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={googlePayEnabled}
                    onChange={(e) => setGooglePayEnabled(e.target.checked)}
                    className="accent-crimson rounded"
                  />
                  <span className="text-zinc-200">Google Pay</span>
                </label>
                <label className="flex items-center gap-2 p-3 rounded-xl bg-[#141414] border border-white/5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={paytmEnabled}
                    onChange={(e) => setPaytmEnabled(e.target.checked)}
                    className="accent-crimson rounded"
                  />
                  <span className="text-zinc-200">Paytm</span>
                </label>
                <label className="flex items-center gap-2 p-3 rounded-xl bg-[#141414] border border-white/5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={otherUpiEnabled}
                    onChange={(e) => setOtherUpiEnabled(e.target.checked)}
                    className="accent-crimson rounded"
                  />
                  <span className="text-zinc-200">Other UPI</span>
                </label>
              </div>
            </div>

            {/* Timer Durations */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-zinc-300 block">Proof Window (Minutes)</label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={proofWindowMinutes}
                  onChange={(e) => setProofWindowMinutes(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#141414] border border-white/10 text-white font-mono focus:outline-none focus:border-bright-red"
                />
                <span className="text-[10px] text-zinc-500 block">Default: 5 Minutes</span>
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-zinc-300 block">Clock Tolerance (Seconds)</label>
                <input
                  type="number"
                  min="0"
                  max="300"
                  value={clockToleranceSeconds}
                  onChange={(e) => setClockToleranceSeconds(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#141414] border border-white/10 text-white font-mono focus:outline-none focus:border-bright-red"
                />
                <span className="text-[10px] text-zinc-500 block">Default: 60 Seconds</span>
              </div>
            </div>

            {/* System Status Toggle */}
            <div className="p-3.5 rounded-2xl bg-[#141414] border border-white/5 flex items-center justify-between">
              <div>
                <span className="font-semibold text-white block">Payment Gateway Enabled</span>
                <span className="text-[10px] text-zinc-500">Temporarily disable if undergoing banking maintenance</span>
              </div>
              <input
                type="checkbox"
                checked={systemEnabled}
                onChange={(e) => setSystemEnabled(e.target.checked)}
                className="w-5 h-5 accent-crimson cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ─── 3. TEST SETTLEMENT FEED INGESTION BOX ─────────────────────────────── */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#0d0d0d] border border-white/10 space-y-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase font-mono">
              Reconciliation Testing & Feed Simulator
            </span>
          </div>
          <h3 className="text-base font-orbitron font-bold text-white mt-1">
            Register Trusted UPI / Bank Settlement Record
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Since CodeXa requires a trusted transaction source to achieve automatic <strong>SUCCESS</strong> (and never approves solely on screenshots), you can register incoming bank settlement records here to test or reconcile payments in real-time.
          </p>
        </div>

        {ingestSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{ingestSuccess}</span>
          </div>
        )}

        <form onSubmit={handleIngestTestTx} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="space-y-1 sm:col-span-1">
            <label className="text-zinc-400 block font-semibold">UTR Number *</label>
            <input
              type="text"
              required
              value={testUtr}
              onChange={(e) => setTestUtr(e.target.value.toUpperCase())}
              placeholder="e.g. 528910482910"
              className="w-full px-3 py-2 rounded-xl bg-[#141414] border border-white/10 text-white font-mono focus:outline-none focus:border-bright-red"
            />
          </div>

          <div className="space-y-1 sm:col-span-1">
            <label className="text-zinc-400 block font-semibold">Amount (₹) *</label>
            <input
              type="number"
              required
              value={testAmount}
              onChange={(e) => setTestAmount(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-[#141414] border border-white/10 text-white font-mono focus:outline-none focus:border-bright-red"
            />
          </div>

          <div className="space-y-1 sm:col-span-1">
            <label className="text-zinc-400 block font-semibold">Sender Name / Bank Ref</label>
            <input
              type="text"
              value={testSender}
              onChange={(e) => setTestSender(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className="w-full px-3 py-2 rounded-xl bg-[#141414] border border-white/10 text-white focus:outline-none focus:border-bright-red"
            />
          </div>

          <div className="flex items-end sm:col-span-1">
            <button
              type="submit"
              disabled={ingestingTx}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-orbitron font-bold text-xs uppercase transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {ingestingTx ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>Add Settlement</span>
            </button>
          </div>
        </form>

        {/* Recent Trusted Transactions Feed Table */}
        {recentTrustedTx.length > 0 && (
          <div className="pt-2">
            <span className="text-[11px] font-mono uppercase text-zinc-400 font-bold block mb-2">
              Recent Settlement Feed Records:
            </span>
            <div className="max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-[#121212]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#181818] text-zinc-400 font-mono text-[10px] uppercase border-b border-white/10">
                  <tr>
                    <th className="py-2 px-3">UTR</th>
                    <th className="py-2 px-3">Amount</th>
                    <th className="py-2 px-3">Sender</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3">Consumed By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                  {recentTrustedTx.map((tx: any) => (
                    <tr key={tx.id} className="hover:bg-white/[0.02]">
                      <td className="py-2 px-3 text-white font-semibold">{tx.utrNumber}</td>
                      <td className="py-2 px-3 text-emerald-400">₹{Number(tx.amount).toFixed(2)}</td>
                      <td className="py-2 px-3 text-zinc-300">{tx.senderName || "Unknown"}</td>
                      <td className="py-2 px-3">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[9px]">
                          {tx.status}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-zinc-400">
                        {tx.consumedByPaymentId ? "Consumed" : "Available"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ─── CONFIRMATION MODAL FOR AMOUNT CHANGE ────────────────────────────── */}
      {showAmountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-3xl bg-[#121212] border border-amber-500/40 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-orbitron font-bold text-white text-base">
                  Confirm Amount Modification
                </h3>
                <span className="text-[11px] font-mono text-zinc-400">Executive Policy Confirmation</span>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              You are updating the fixed mandatory internship bill from{" "}
              <strong className="text-white">₹{fixedAmount}</strong> to{" "}
              <strong className="text-amber-400">₹{tentativeAmount}</strong>.
            </p>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300">
              Note: Existing issued bills will retain their original expected amount snapshot so active sessions do not break midway.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setTentativeAmount(fixedAmount);
                  setShowAmountModal(false);
                }}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveSettings(tentativeAmount)}
                className="px-4 py-2 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-bold uppercase"
              >
                Confirm & Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
