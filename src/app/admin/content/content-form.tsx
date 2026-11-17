"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { updateCmsContent, type ContentActionState } from "./actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const INITIAL: ContentActionState = { ok: false };

const SELECT_CLASSES =
  "flex h-11 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/25 focus-visible:border-brand-500";

export function ContentForm({
  contentKey,
  valueJson,
  status,
}: {
  contentKey: string;
  valueJson: string;
  status: string;
}) {
  const [state, action, pending] = useActionState<ContentActionState, FormData>(
    updateCmsContent,
    INITIAL
  );

  useEffect(() => {
    if (!state.message) return;
    if (state.ok) toast.success(state.message);
    else toast.error(state.message);
  }, [state]);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="key" value={contentKey} />

      <div className="space-y-2">
        <Label htmlFor={`value-${contentKey}`}>Content (JSON)</Label>
        <Textarea
          id={`value-${contentKey}`}
          name="value"
          rows={10}
          defaultValue={valueJson}
          spellCheck={false}
          className="font-mono text-xs"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="space-y-2">
          <Label htmlFor={`status-${contentKey}`}>Publish status</Label>
          <select
            id={`status-${contentKey}`}
            name="status"
            defaultValue={status}
            className={SELECT_CLASSES}
          >
            <option value="published">Published — visible to everyone</option>
            <option value="draft">Draft — staff only</option>
          </select>
        </div>
        <Button type="submit" size="sm" disabled={pending}>
          <Save className="h-4 w-4" aria-hidden="true" />
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>

      <p aria-live="polite" role="status" className="text-xs text-ink-400">
        {state.message ?? ""}
      </p>
    </form>
  );
}
