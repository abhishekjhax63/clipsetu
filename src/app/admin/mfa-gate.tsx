"use client";

import {
  useActionState,
  useEffect,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import {
  beginTotpEnrollment,
  confirmTotpEnrollment,
  verifyTotpChallenge,
  type MfaActionState,
} from "./mfa-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const INITIAL: MfaActionState = {};

/**
 * Blocks the admin surface until the signed-in staff member has a verified TOTP
 * factor AND an AAL2 session. Handles both first-time enrolment and the step-up
 * challenge.
 */
export function MfaGate({
  enrolled,
  factorId,
  email,
}: {
  enrolled: boolean;
  factorId: string | null;
  email: string;
}) {
  const router = useRouter();

  const [enrolment, setEnrolment] = useState<MfaActionState | null>(null);
  const [starting, startTransition] = useTransition();

  const [confirmState, confirmAction, confirming] = useActionState<
    MfaActionState,
    FormData
  >(confirmTotpEnrollment, INITIAL);

  const [challengeState, challengeAction, challenging] = useActionState<
    MfaActionState,
    FormData
  >(verifyTotpChallenge, INITIAL);

  useEffect(() => {
    if (confirmState.ok || challengeState.ok) router.refresh();
  }, [confirmState.ok, challengeState.ok, router]);

  function startEnrolment() {
    startTransition(async () => {
      setEnrolment(await beginTotpEnrollment());
    });
  }

  const needsEnrolment = !enrolled;

  return (
    <div className="mx-auto max-w-md py-6">
      <Card>
        <CardHeader>
          <span className="mb-1 flex h-11 w-11 items-center justify-center rounded-xl bg-surface-muted">
            <ShieldCheck className="h-5 w-5 text-ink-700" aria-hidden="true" />
          </span>
          <CardTitle>
            {needsEnrolment
              ? "Set up two-factor authentication"
              : "Two-factor verification"}
          </CardTitle>
          <CardDescription>
            {needsEnrolment
              ? `Privileged admin access requires MFA. Enrol an authenticator app for ${email} to continue.`
              : "Enter the 6-digit code from your authenticator app to continue."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {needsEnrolment ? (
            enrolment?.qrCode ? (
              <form action={confirmAction} className="space-y-4">
                <input
                  type="hidden"
                  name="factorId"
                  value={enrolment.factorId ?? ""}
                />
                <div className="flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={enrolment.qrCode}
                    alt="Authenticator QR code"
                    className="h-44 w-44 rounded-xl border border-border-soft bg-white p-2"
                  />
                </div>
                <div className="rounded-xl bg-surface-muted p-3">
                  <p className="text-xs text-ink-500">
                    Or enter this key manually:
                  </p>
                  <p className="mt-1 break-all font-mono text-xs text-ink-900">
                    {enrolment.secret}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="enroll-code">Verification code</Label>
                  <Input
                    id="enroll-code"
                    name="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    placeholder="123456"
                    required
                  />
                </div>
                {confirmState.error ? (
                  <p role="alert" className="text-sm text-danger">
                    {confirmState.error}
                  </p>
                ) : null}
                <Button type="submit" className="w-full" disabled={confirming}>
                  {confirming ? (
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  )}
                  {confirming ? "Verifying…" : "Activate MFA"}
                </Button>
              </form>
            ) : (
              <div className="space-y-3">
                {enrolment?.error ? (
                  <p role="alert" className="text-sm text-danger">
                    {enrolment.error}
                  </p>
                ) : null}
                <Button
                  type="button"
                  className="w-full"
                  onClick={startEnrolment}
                  disabled={starting}
                >
                  {starting ? (
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <KeyRound className="h-4 w-4" aria-hidden="true" />
                  )}
                  {starting ? "Preparing…" : "Set up authenticator"}
                </Button>
              </div>
            )
          ) : (
            <form action={challengeAction} className="space-y-4">
              <input type="hidden" name="factorId" value={factorId ?? ""} />
              <div className="space-y-2">
                <Label htmlFor="challenge-code">Verification code</Label>
                <Input
                  id="challenge-code"
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="123456"
                  required
                />
              </div>
              {challengeState.error ? (
                <p role="alert" className="text-sm text-danger">
                  {challengeState.error}
                </p>
              ) : null}
              {!factorId ? (
                <p className="text-xs text-danger">
                  No verified factor was found. Sign out and back in, then try
                  again.
                </p>
              ) : null}
              <Button
                type="submit"
                className="w-full"
                disabled={challenging || !factorId}
              >
                {challenging ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                )}
                {challenging ? "Verifying…" : "Verify"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
