"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { TeamCoreShell } from "@/components/layout/TeamCoreShell";
import { useAuth } from "@/context/AuthContext";
import { hasPermission, Permission, getEffectiveRole, getRoleDisplayName, isProtectedAccount } from "@/lib/permissions";
import { CreateAccountModal } from "@/components/dashboard/CreateAccountModal";
import { CodeXaAvatar } from "@/components/ui/CodeXaAvatar";
import { Users, UserPlus, Filter, Shield, AlertCircle, RefreshCw, Key, CheckCircle2, Lock, Trash2, UserX, UserCheck } from "lucide-react";

function AccountsContent() {
  const searchParams = useSearchParams();
  const initialFilter = searchParams.get("filter") || "ALL";
  const initialAction = searchParams.get("action");

  const { user } = useAuth();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState(initialFilter);
  const [modalOpen, setModalOpen] = useState(initialAction === "create");

  const canCreate = hasPermission(user, Permission.CREATE_USERS);
  const canViewUsers = hasPermission(user, Permission.VIEW_USERS);
  const canDelete = hasPermission(user, Permission.DELETE_USERS);
  const canEdit = hasPermission(user, Permission.EDIT_USERS);
  const actorRole = user ? getEffectiveRole(user) : "EMPLOYEE";

  useEffect(() => {
    const f = searchParams.get("filter");
    if (f) setRoleFilter(f);
    if (searchParams.get("action") === "create") setModalOpen(true);
  }, [searchParams]);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/owner/accounts");
      const data = await res.json();
      if (data.accounts) setAccounts(data.accounts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async (acc: any) => {
    if (!confirm(`Are you sure you want to permanently remove member @${acc.username}? This action is irreversible.`)) return;
    try {
      const res = await fetch(`/api/owner/accounts/${acc.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAccounts((prev) => prev.filter((a) => a.id !== acc.id));
      } else {
        alert(data.error || "Failed to remove member.");
      }
    } catch {
      alert("Network error removing member.");
    }
  };

  const handleToggleStatus = async (acc: any) => {
    const nextStatus = !acc.isActive;
    try {
      const res = await fetch(`/api/owner/accounts/${acc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextStatus }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAccounts((prev) => prev.map((a) => (a.id === acc.id ? { ...a, isActive: nextStatus } : a)));
      } else {
        alert(data.error || "Failed to update account status.");
      }
    } catch {
      alert("Network error updating status.");
    }
  };

  useEffect(() => {
    if (user && canViewUsers) {
      loadAccounts();
    }
  }, [user, canViewUsers]);


  if (!canViewUsers) {
    return (
      <TeamCoreShell title="Crew & Staff Directory">
        <div className="p-12 text-center rounded-2xl bg-[#090909] border border-crimson/20 max-w-md mx-auto space-y-4">
          <AlertCircle className="w-10 h-10 text-bright-red mx-auto" />
          <h2 className="font-orbitron font-bold text-base text-white">ACCESS RESTRICTED</h2>
          <p className="text-xs text-[#888]">
            Your organizational role ({actorRole}) does not possess staff management authorization.
          </p>
        </div>
      </TeamCoreShell>
    );
  }

  const filteredAccounts = accounts.filter((acc) => {
    if (roleFilter === "ALL") return true;
    if (roleFilter === "LEADERSHIP") {
      return ["FOUNDER", "CO_FOUNDER", "CEO", "CTO", "HR", "COO", "OWNER", "ADMIN"].includes(acc.role);
    }
    if (roleFilter === "EMPLOYEES") {
      return acc.role === "EMPLOYEE";
    }
    if (roleFilter === "INTERNS") {
      return acc.role === "INTERN";
    }
    return acc.role === roleFilter;
  });

  return (
    <TeamCoreShell
      title="Crew & Staff Directory"
      subtitle="Identity lifecycle & access control management"
      actions={
        <div className="flex items-center gap-2.5">
          <button
            onClick={loadAccounts}
            className="p-2 rounded-xl bg-[#141414] hover:bg-deep-red/20 border border-crimson/30 text-[#888] hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          {canCreate && (
            <button
              onClick={() => setModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-crimson hover:bg-bright-red text-white text-xs font-orbitron font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(217,4,41,0.3)] flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Provision Account</span>
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        
        {/* Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-[#090909] border border-crimson/20">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-crimson" />
            <span className="text-xs font-orbitron font-bold uppercase text-white">Filter Directory:</span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-[#121212] border border-crimson/20 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
            >
              <option value="ALL">All Accounts ({accounts.length})</option>
              <option value="LEADERSHIP">Leadership & Executives</option>
              <option value="EMPLOYEES">Core Employees</option>
              <option value="INTERNS">Interns</option>
            </select>
          </div>
        </div>

        {/* Accounts Grid */}
        {loading ? (
          <div className="p-12 text-center text-xs text-[#888]">Loading accounts stream...</div>
        ) : filteredAccounts.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-[#090909] border border-white/5 space-y-2">
            <Users className="w-8 h-8 text-[#555] mx-auto" />
            <h3 className="font-orbitron font-bold text-sm text-white">No Matching Accounts</h3>
            <p className="text-xs text-[#777]">No identities found under the selected filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAccounts.map((acc) => {
              const displayTitle = getRoleDisplayName(acc.orgRole || acc.role);
              const isLeadership = ["FOUNDER", "CO_FOUNDER", "CEO", "CTO", "HR", "COO", "OWNER", "ADMIN"].includes(acc.role);

              return (
                <div
                  key={acc.id}
                  className="p-5 rounded-2xl bg-[#0A0A0A] border border-crimson/20 hover:border-crimson/40 transition-colors flex flex-col justify-between space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <CodeXaAvatar src={acc.mediaUrl} alt={acc.displayName} size="md" showGlow={isLeadership} />
                      <div>
                        <h4 className="font-orbitron font-bold text-sm text-white leading-tight">
                          {acc.displayName}
                        </h4>
                        <p className="text-[10px] font-mono text-crimson">@{acc.username}</p>
                        <p className="text-[11px] text-[#777] mt-0.5">{acc.email}</p>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-orbitron font-bold uppercase ${
                        isLeadership
                          ? "bg-deep-red/25 text-bright-red border border-crimson/40"
                          : "bg-white/5 text-[#aaa] border border-white/10"
                      }`}
                    >
                      {acc.orgRole || acc.role}
                    </span>
                  </div>

                  <div className="pt-3 border-t border-white/5 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-[#888]">
                      <span>Title:</span>
                      <strong className="text-white font-medium">{displayTitle}</strong>
                    </div>

                    {acc.department && (
                      <div className="flex items-center justify-between text-[#888]">
                        <span>Department:</span>
                        <strong className="text-[#ccc]">{acc.department}</strong>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[#888]">
                      <span>Account Status:</span>
                      <span className={`inline-flex items-center gap-1 font-bold ${acc.isActive ? "text-green-400" : "text-red-400"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${acc.isActive ? "bg-green-400" : "bg-red-400"}`} />
                        {acc.isActive ? "Active" : "Disabled"}
                      </span>
                    </div>

                    {acc.mustChangePassword && (
                      <div className="flex items-center gap-1.5 text-[10px] text-yellow-400/90 font-mono mt-1">
                        <Lock className="w-3 h-3" />
                        <span>Password reset required on login</span>
                      </div>
                    )}
                  </div>

                  {/* Actions for Authorized Roles (CTO, HR, Owner, CEO) */}
                  {!isProtectedAccount(acc) && acc.id !== user?.id && (canEdit || canDelete) && (
                    <div className="pt-3 border-t border-white/5 flex items-center justify-end gap-2">
                      {canEdit && (
                        <button
                          onClick={() => handleToggleStatus(acc)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-orbitron font-bold uppercase transition-colors inline-flex items-center gap-1 ${
                            acc.isActive
                              ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 hover:bg-yellow-500/20"
                              : "bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20"
                          }`}
                          title={acc.isActive ? "Deactivate Account" : "Activate Account"}
                        >
                          {acc.isActive ? <UserX className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                          <span>{acc.isActive ? "Disable" : "Enable"}</span>
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDeleteAccount(acc)}
                          className="px-2.5 py-1 rounded-lg bg-crimson/15 text-bright-red border border-crimson/30 hover:bg-crimson hover:text-white text-[10px] font-orbitron font-bold uppercase transition-all inline-flex items-center gap-1"
                          title="Remove Member"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Modal for Account Provisioning */}
        <CreateAccountModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onAccountCreated={() => loadAccounts()}
        />
      </div>
    </TeamCoreShell>
  );
}

export default function AccountsManagementPage() {
  return (
    <Suspense
      fallback={
        <TeamCoreShell title="Crew & Staff Directory">
          <div className="p-12 text-center text-xs text-[#888]">Loading accounts directory...</div>
        </TeamCoreShell>
      }
    >
      <AccountsContent />
    </Suspense>
  );
}

