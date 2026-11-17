"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { updatePlatformSetting, type SettingActionState } from "./actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const INITIAL: SettingActionState = { ok: false };

export function SettingForm({
  settingKey,
  valueJson,
  disabled,
}: {
  settingKey: string;
  valueJson: string;
  disabled: boolean;
}) {
  const [state, action, pending] = useActionState<SettingActionState, FormData>(
    updatePlatformSetting,
    INITIAL
  );

  useEffect(() => {
    if (!state.message) return;
    if (state.ok) toast.success(state.message);
    else toast.error(state.message);
  }, [state]);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="key" value={settingKey} />
      <div className="space-y-2">
        <Label htmlFor={`value-${settingKey}`}>Value (JSON)</Label>
        <Textarea
          id={`value-${settingKey}`}
          name="value"
          rows={3}
          defaultValue={valueJson}
          disabled={disabled}
          spellCheck={false}
          className="font-mono text-xs"
        />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p aria-live="polite" role="status" className="text-xs text-ink-400">
          {state.message ?? ""}
        </p>
        <Button type="submit" size="sm" disabled={disabled || pending}>
          <Save className="h-4 w-4" aria-hidden="true" />
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
      {disabled ? (
        <p className="text-xs text-warning">
          Sensitive setting — only a super admin can edit this value.
        </p>
      ) : null}
    </form>
  );
}
