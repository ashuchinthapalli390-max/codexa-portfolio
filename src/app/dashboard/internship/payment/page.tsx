"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { CreditCard, CheckCircle2, ShieldAlert } from "lucide-react";

export default function InternshipPaymentRedirectPage() {
  const router = useRouter();
  const { user, status } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login?redirect=/dashboard/internship/payment");
      return;
    }

    if (status === "authenticated" && user) {
      // Find or redirect to the intern's mandatory ₹450 payment
      fetch("/api/payments?purpose=INTERNSHIP_FEE")
        .then((res) => res.json())
        .then((data) => {
          if (data.payments && data.payments.length > 0) {
            // Found existing payment request
            const target = data.payments[0];
            router.replace(`/dashboard/payments/${target.id}`);
          } else {
            // Check all payments
            return fetch("/api/payments")
              .then((r) => r.json())
              .then((allData) => {
                if (allData.payments && allData.payments.length > 0) {
                  router.replace(`/dashboard/payments/${allData.payments[0].id}`);
                } else {
                  router.replace("/dashboard/payments");
                }
              });
          }
        })
        .catch((err) => {
          console.error("Error resolving payment:", err);
          router.replace("/dashboard/payments");
        });
    }
  }, [status, user, router]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
      <div className="w-12 h-12 rounded-2xl bg-bright-red/20 border border-bright-red/30 flex items-center justify-center text-bright-red animate-pulse">
        <CreditCard className="w-6 h-6" />
      </div>
      <div>
        <h2 className="font-orbitron font-bold text-white text-lg">
          Connecting to CodeXa Secure Billing...
        </h2>
        <p className="text-xs text-zinc-400 mt-1">
          Verifying authenticated student session &bull; Mandatory ₹450 Service Fee
        </p>
      </div>
      <div className="w-6 h-6 border-2 border-bright-red border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
