"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { TriangleExclamationPoint } from "lucide-react";
import {
  addInternalNote,
  decideBrandVerification,
  setUserRole,
  setUserStatus,
  type UserActionState,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const SELECT_CLASS =
  "h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/25 focus-visible:border-brand-500";

const STATUSES = ["active", "suspended", "restricted", "pending"] as const;

const BASE_ROLES = ["brand", "clipper", "moderation"] as const;
const PRIVILEGED_ROLES = ["admin", "super_admin"] as const;

const DECISIONS = ["verified", "rejected", "under_review", "suspended"] as const;

const INITIAL: UserActionState = { ok: false };

function FormFeedback({ state }: { state: UserActionState }) {
  if (!state.message) return null;
  return (
    <p
      aria-live="polite"
      role="status"
      className={
        state.ok
          ? "text-xs text-brand-700"
          : "text-xs text-danger"
      }
    >
      {state.message}
    </p>
  );
}

function useToastResult(state: UserActionState): void {
  useEffect(() => {
    if (!state.message) return;
    if (state.ok) toast.success(state.message);
    else toast.error(state.message);
  }, [state]);
}

export function UserStatusForm({
  userId,
  currentStatus,
}: {
  userId: string;
  currentStatus: string;
}) {
  const [state, action, pending] = useActionState<UserActionState, FormData>(
    setUserStatus,
    INITIAL
  );
  useToastResult(state);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account status</CardTitle>
        <CardDescription>
          Suspend, restrict or re-activate this account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-3">
          <input type="hidden" name="userId" value={userId} />
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              name="status"
              className={SELECT_CLASS}
              defaultValue={
                (STATUSES as readonly string[]).includes(currentStatus)
                  ? currentStatus
                  : "active"
              }
            >
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <FormFeedback state={state} />
            <Button type="submit" disabled={pending} size="sm">
              {pending ? "Saving…" : "Update status"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function UserRoleForm({
  userId,
  currentRole,
  actorRole,
  isSelf,
}: {
  userId: string;
  currentRole: string;
  actorRole: string;
  isSelf: boolean;
}) {
  const [state, action, pending] = useActionState<UserActionState, FormData>(
    setUserRole,
    INITIAL
  );
  useToastResult(state);

  const roles: string[] = [...BASE_ROLES];
  if (actorRole === "super_admin") roles.push(...PRIVILEGED_ROLES);

  if (isSelf) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Role</CardTitle>
          <CardDescription>
            You cannot change your own role.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-2 rounded-xl border border-border-soft bg-surface-soft p-3 text-xs leading-relaxed text-ink-500">
            <TriangleExclamationPoint
              className="mt-0.5 h-3.5 w-3.5 shrink-0"
              aria-hidden="true"
            />
            <span>
              Self role changes are blocked. Ask another administrator (or a
              super admin for administrator roles) to change your role.
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Role</CardTitle>
        <CardDescription>
          Only a super admin may grant administrator roles.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-3">
          <input type="hidden" name="userId" value={userId} />
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <select
              id="role"
              name="role"
              className={SELECT_CLASS}
              defaultValue={roles.includes(currentRole) ? currentRole : roles[0]}
            >
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <FormFeedback state={state} />
            <Button type="submit" disabled={pending} size="sm">
              {pending ? "Saving…" : "Update role"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function BrandVerificationForm({
  userId,
  currentStatus,
  currentReason,
}: {
  userId: string;
  currentStatus: string;
  currentReason: string | null;
}) {
  const [state, action, pending] = useActionState<UserActionState, FormData>(
    decideBrandVerification,
    INITIAL
  );
  useToastResult(state);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Brand verification</CardTitle>
        <CardDescription>
          Approve or reject this brand&apos;s verification.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-3">
          <input type="hidden" name="userId" value={userId} />
          <div className="space-y-2">
            <Label htmlFor="decision">Decision</Label>
            <select
              id="decision"
              name="decision"
              className={SELECT_CLASS}
              defaultValue={
                (DECISIONS as readonly string[]).includes(currentStatus)
                  ? currentStatus
                  : "under_review"
              }
            >
              {DECISIONS.map((decision) => (
                <option key={decision} value={decision}>
                  {decision.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              name="reason"
              rows={3}
              maxLength={1000}
              defaultValue={currentReason ?? ""}
              placeholder="Required when rejecting or suspending."
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <FormFeedback state={state} />
            <Button type="submit" disabled={pending} size="sm">
              {pending ? "Saving…" : "Save decision"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function InternalNoteForm({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState<UserActionState, FormData>(
    addInternalNote,
    INITIAL
  );
  useToastResult(state);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="userId" value={userId} />
      <div className="space-y-2">
        <Label htmlFor="note">Add internal note</Label>
        <Textarea
          id="note"
          name="note"
          rows={3}
          maxLength={4000}
          placeholder="Staff-only note about this account."
        />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <FormFeedback state={state} />
        <Button type="submit" disabled={pending} size="sm">
          {pending ? "Saving…" : "Add note"}
        </Button>
      </div>
    </form>
  );
}
