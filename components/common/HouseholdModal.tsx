"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Home, UserPlus, Copy, Check, LogOut, Trash2, Users } from "lucide-react";

interface HouseholdData {
  _id: string;
  name: string;
  inviteCode: string;
  createdBy: string;
  memberDetails: { _id: string; name: string; email: string }[];
}

interface HouseholdModalProps {
  open: boolean;
  onClose: () => void;
}

export function HouseholdModal({ open, onClose }: HouseholdModalProps) {
  const { data: session, update } = useSession();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"view" | "create" | "join">("view");
  const [householdName, setHouseholdName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [apiError, setApiError] = useState("");

  const { data: household, isLoading } = useQuery<HouseholdData | null>({
    queryKey: ["household"],
    queryFn: () => fetch("/api/household").then((r) => r.json()),
    enabled: open,
  });

  async function refreshSession(householdId: string | null) {
    await update({ householdId });
    queryClient.invalidateQueries({ queryKey: ["household"] });
    queryClient.invalidateQueries({ queryKey: ["meals"] });
    queryClient.invalidateQueries({ queryKey: ["weekly-menu"] });
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/household", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: householdName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      refreshSession(data.householdId);
      setTab("view");
      setHouseholdName("");
      setApiError("");
    },
    onError: (e: Error) => setApiError(e.message),
  });

  const joinMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/household/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      refreshSession(data.householdId);
      setTab("view");
      setInviteCode("");
      setApiError("");
    },
    onError: (e: Error) => setApiError(e.message),
  });

  const leaveMutation = useMutation({
    mutationFn: () => fetch("/api/household/leave", { method: "POST" }).then((r) => r.json()),
    onSuccess: () => refreshSession(null),
  });

  const deleteMutation = useMutation({
    mutationFn: () => fetch("/api/household", { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => refreshSession(null),
  });

  function copyCode() {
    if (!household?.inviteCode) return;
    navigator.clipboard.writeText(household.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const isOwner = household?.createdBy === session?.user?.id;

  return (
    <Modal open={open} onClose={onClose} title="Mi Hogar" size="md">
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
        </div>
      ) : !session?.user?.householdId ? (
        /* ─── No household ─── */
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No perteneces a ningún hogar. Crea uno nuevo o únete con un código de invitación.
          </p>

          <div className="flex gap-2">
            <button
              onClick={() => { setTab("create"); setApiError(""); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-colors ${tab === "create" ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400" : "border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-slate-300"}`}
            >
              <Home className="w-4 h-4" />
              Crear hogar
            </button>
            <button
              onClick={() => { setTab("join"); setApiError(""); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-colors ${tab === "join" ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400" : "border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-slate-300"}`}
            >
              <UserPlus className="w-4 h-4" />
              Unirse
            </button>
          </div>

          {tab === "create" && (
            <div className="flex flex-col gap-3">
              <Input
                label="Nombre del hogar"
                placeholder="Ej: Familia García"
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
              />
              {apiError && <p className="text-xs text-red-500">{apiError}</p>}
              <Button
                onClick={() => createMutation.mutate()}
                loading={createMutation.isPending}
                disabled={!householdName.trim()}
              >
                Crear hogar
              </Button>
            </div>
          )}

          {tab === "join" && (
            <div className="flex flex-col gap-3">
              <Input
                label="Código de invitación"
                placeholder="Ej: AB3X7K"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                className="uppercase tracking-widest font-mono"
              />
              {apiError && <p className="text-xs text-red-500">{apiError}</p>}
              <Button
                onClick={() => joinMutation.mutate()}
                loading={joinMutation.isPending}
                disabled={inviteCode.length < 6}
              >
                Unirse al hogar
              </Button>
            </div>
          )}
        </div>
      ) : (
        /* ─── Has household ─── */
        <div className="flex flex-col gap-5">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-lg">
                {household?.name}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {household?.memberDetails?.length ?? 0} miembro{(household?.memberDetails?.length ?? 0) !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-xl">
              <span className="text-sm font-mono font-bold tracking-widest text-slate-700 dark:text-slate-200">
                {household?.inviteCode}
              </span>
              <button
                onClick={copyCode}
                className="text-slate-400 hover:text-emerald-500 transition-colors"
                title="Copiar código"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Members */}
          <div className="flex flex-col gap-2">
            <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              <Users className="w-3.5 h-3.5" />
              Miembros
            </p>
            <div className="flex flex-col gap-1">
              {household?.memberDetails?.map((member) => (
                <div key={member._id} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                  <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                      {member.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                      {member.name}
                      {member._id === session?.user?.id && (
                        <span className="ml-2 text-xs text-slate-400">(tú)</span>
                      )}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{member.email}</p>
                  </div>
                  {member._id === household?.createdBy && (
                    <span className="text-xs bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                      Admin
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-700/50 rounded-xl px-3 py-2">
            Comparte el código <strong>{household?.inviteCode}</strong> para que otros se unan a tu hogar y vean las mismas comidas y menús.
          </p>

          {/* Actions */}
          <div className="flex gap-2 pt-1 border-t border-slate-100 dark:border-slate-700">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1.5"
              onClick={() => leaveMutation.mutate()}
              loading={leaveMutation.isPending}
            >
              <LogOut className="w-3.5 h-3.5" />
              Salir del hogar
            </Button>
            {isOwner && (
              <Button
                variant="danger"
                size="sm"
                className="gap-1.5"
                onClick={() => deleteMutation.mutate()}
                loading={deleteMutation.isPending}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Eliminar
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
