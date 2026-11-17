"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { completeBrandOnboarding } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BUSINESS_CATEGORIES } from "@/lib/constants";

export function BrandOnboardingForm({
  defaultContactName = "",
  defaultEmail = "",
}: {
  defaultContactName?: string;
  defaultEmail?: string;
}) {
  const [state, action, pending] = useActionState(
    completeBrandOnboarding,
    undefined
  );

  useEffect(() => {
    if (state?.message) toast.error(state.message);
  }, [state]);

  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="brandName">Brand / company name</Label>
          <Input id="brandName" name="brandName" required placeholder="Acme Pvt Ltd" />
          {state?.errors?.brandName && (
            <p className="text-xs text-danger">{state.errors.brandName[0]}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="contactPerson">Contact person</Label>
          <Input
            id="contactPerson"
            name="contactPerson"
            required
            defaultValue={defaultContactName}
            placeholder="Priya Sharma"
          />
          {state?.errors?.contactPerson && (
            <p className="text-xs text-danger">{state.errors.contactPerson[0]}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="officialEmail">Official email</Label>
          <Input
            id="officialEmail"
            name="officialEmail"
            type="email"
            required
            defaultValue={defaultEmail}
            placeholder="marketing@acme.com"
          />
          {state?.errors?.officialEmail && (
            <p className="text-xs text-danger">{state.errors.officialEmail[0]}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="companyWebsite">Company website</Label>
          <Input
            id="companyWebsite"
            name="companyWebsite"
            placeholder="acme.com"
            inputMode="url"
          />
          {state?.errors?.companyWebsite && (
            <p className="text-xs text-danger">{state.errors.companyWebsite[0]}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="businessCategory">Business category</Label>
          <select
            id="businessCategory"
            name="businessCategory"
            required
            defaultValue=""
            className="flex h-11 w-full rounded-lg border border-border bg-surface px-3.5 text-sm text-ink-900 shadow-xs transition-colors focus-visible:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/25"
          >
            <option value="" disabled>
              Select a category
            </option>
            {BUSINESS_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {state?.errors?.businessCategory && (
            <p className="text-xs text-danger">
              {state.errors.businessCategory[0]}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="country">Country</Label>
          <Input
            id="country"
            name="country"
            required
            defaultValue="India"
            placeholder="India"
          />
          {state?.errors?.country && (
            <p className="text-xs text-danger">{state.errors.country[0]}</p>
          )}
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="gstin">GSTIN (optional)</Label>
          <Input
            id="gstin"
            name="gstin"
            placeholder="22AAAAA0000A1Z5"
            maxLength={20}
          />
          {state?.errors?.gstin && (
            <p className="text-xs text-danger">{state.errors.gstin[0]}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">About your brand</Label>
        <Textarea
          id="description"
          name="description"
          maxLength={2000}
          placeholder="Tell creators what your brand does and the kind of content you're looking for."
        />
        {state?.errors?.description && (
          <p className="text-xs text-danger">{state.errors.description[0]}</p>
        )}
      </div>

      <p className="rounded-xl border border-border-soft bg-surface-soft p-4 text-xs leading-relaxed text-ink-500">
        Submitting sends your brand for verification. Brand accounts must be
        verified before campaigns can go live. Business verification documents
        and logo upload become available once file storage is configured.
      </p>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Submitting..." : "Submit for verification"}
      </Button>
    </form>
  );
}
