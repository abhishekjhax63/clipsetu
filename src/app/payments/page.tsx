import type { Metadata } from "next";
import Link from "next/link";
import { LegalLayout, LegalSection } from "@/components/layout/legal-layout";
import { APP_NAME, MIN_WITHDRAWAL_INR, PLATFORM_FEE_PERCENT } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Payment & Refund Policy",
  description:
    "How ClipSetu handles brand deposits, the platform fee, reward calculation, withdrawals, payouts, refunds, chargebacks and taxes.",
};

export default function PaymentsPage() {
  return (
    <LegalLayout
      title="Payment & Refund Policy"
      lastUpdated="14 November 2026"
      intro={`This policy explains how money moves through ${APP_NAME} — brand deposits, creator rewards, fees, withdrawals and refunds.`}
    >
      <LegalSection title="1. Brand deposits and campaign funding">
        <p>
          Brands fund their campaign wallet before a campaign goes live. Deposits
          are held for creator rewards and released as eligible views are
          verified. Campaigns that are not funded are not shown in the
          marketplace.
        </p>
        <p>
          Deposits are made through our third-party payment providers. Deposits
          are not refundable once the corresponding rewards have been committed to
          creators (see section 7).
        </p>
      </LegalSection>

      <LegalSection title="2. Platform fee">
        <p>
          {APP_NAME} charges a platform fee of {PLATFORM_FEE_PERCENT}% on creator
          earnings. The fee is deducted from the reward amount before it is
          credited to a creator&apos;s wallet. The applicable percentage is
          configurable and is shown clearly on the relevant campaign and payment
          screens.
        </p>
        <p>No platform fee is charged on brand deposits.</p>
      </LegalSection>

      <LegalSection title="3. How rewards are calculated">
        <p>Creator rewards are based on eligible verified views:</p>
        <p className="rounded-xl border border-border-soft bg-surface-soft p-4 font-mono text-ink-900">
          (eligible verified views ÷ 1,000) × campaign reward rate
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Only views reported through official platform APIs and eligible under
            the campaign rules count.
          </li>
          <li>
            Rewards are capped at the maximum reward amount set for the campaign.
          </li>
          <li>
            Views found to be artificially inflated are excluded or reversed.
          </li>
          <li>
            Rewards are credited to your wallet once a submission is approved and
            views are verified.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Minimum withdrawal and KYC">
        <p>
          The minimum withdrawal amount is ₹{MIN_WITHDRAWAL_INR}. Before any
          withdrawal, you must complete identity verification (KYC). Withdrawals
          are paid to a bank account in your name.
        </p>
      </LegalSection>

      <LegalSection title="5. Payout timelines and provider">
        <p>
          Payouts are processed through a third-party payment provider (for
          example Razorpay or Cashfree), subject to their approval and to your
          account being verified. We do not guarantee a specific provider.
        </p>
        <p>
          Once a withdrawal is approved, payouts are typically processed within
          3–5 business days. Timelines may be longer around holidays or where
          additional checks are required.
        </p>
      </LegalSection>

      <LegalSection title="6. Failed and reversed payouts">
        <p>
          A payout may fail or be reversed if the bank details are incorrect,
          verification is incomplete, or the provider declines the transaction. In
          that case, the funds are returned to your wallet for a corrected
          withdrawal, and we will notify you.
        </p>
        <p>
          If a payout is later found to be fraudulent or reversed by the payment
          provider, the corresponding amount may be debited from your wallet.
        </p>
      </LegalSection>

      <LegalSection title="7. Refunds of unused brand budget">
        <p>
          Unused campaign budget that has not been committed to approved rewards
          may be refunded to the brand when a campaign ends or is cancelled.
          Refunds, where applicable, are returned to the original payment method
          after any applicable deductions and subject to review.
        </p>
        <p>
          Funds already committed to approved submissions or verified views are
          used to pay creators and are not refundable.
        </p>
      </LegalSection>

      <LegalSection title="8. Chargebacks and disputes">
        <p>
          If a payment is subject to a chargeback or dispute, we may freeze the
          related balance while the matter is investigated. Please contact us
          before initiating a chargeback so we can resolve the issue directly.
        </p>
        <p>
          Fraudulent chargebacks may result in suspension of the associated
          account and recovery of the disputed amount to the extent permitted by
          law.
        </p>
      </LegalSection>

      <LegalSection title="9. Taxes, GST and TDS">
        <p>
          You are responsible for the taxes applicable to your activity on{" "}
          {APP_NAME}. Where required by law, we may deduct tax at source (TDS) on
          creator payouts and issue the relevant certificate. Brands are
          responsible for any GST applicable to their campaigns and for providing
          a valid GSTIN where relevant.
        </p>
        <p>
          Tax treatment depends on your individual circumstances, and we recommend
          consulting a qualified professional.
        </p>
      </LegalSection>

      <LegalSection title="10. Contact">
        <p>
          For payment or refund questions, please{" "}
          <Link
            href="/contact"
            className="font-medium text-ink-900 underline-offset-4 hover:underline"
          >
            contact us
          </Link>{" "}
          or see our{" "}
          <Link
            href="/faq"
            className="font-medium text-ink-900 underline-offset-4 hover:underline"
          >
            FAQ
          </Link>
          .
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
