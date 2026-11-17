import type { Metadata } from "next";
import { LegalLayout, LegalSection } from "@/components/layout/legal-layout";

export const metadata: Metadata = {
  title: "Brand Guidelines",
  description:
    "ClipSetu brand guidelines: funding campaigns, setting fair reward rules, briefs, review expectations, prohibited briefs and refunds.",
};

export default function BrandGuidelinesPage() {
  return (
    <LegalLayout
      title="Brand Guidelines"
      lastUpdated="14 November 2026"
      intro="These guidelines explain how brands run campaigns on ClipSetu responsibly. They apply alongside our Terms & Conditions and Community Guidelines."
    >
      <LegalSection title="1. Fund campaigns before launch">
        <p>
          A campaign must be fully funded before it goes live. Funds are held for
          creator rewards and released as eligible views are verified. Campaigns
          that are not funded remain in draft or pending payment and are not shown
          in the marketplace.
        </p>
        <p>
          Your campaign budget should cover the reward rate you set across the
          reward cap and the number of creators you expect to approve. We may
          pause a campaign when the remaining budget can no longer cover expected
          rewards.
        </p>
      </LegalSection>

      <LegalSection title="2. Set fair reward rules">
        <p>
          Reward rates, caps, eligible platforms and the reward period are fixed
          when a campaign launches and are shown to creators up front. You must
          not retroactively change terms that creators have already accepted.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Set a reward rate that reflects the effort and value of the clip.</li>
          <li>Publish any minimum view threshold or eligibility criteria clearly.</li>
          <li>
            Do not reduce the reward rate for already-approved submissions in
            order to lower payouts.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Write clear briefs and provide source materials">
        <p>
          A good brief helps creators produce content that fits your brand. Your
          brief should describe the goal, format, key messages, do&apos;s and
          don&apos;ts, and any required assets.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Provide source material you own or are licensed to share with
            creators.
          </li>
          <li>
            State disclosure requirements so creators can label paid partnerships
            correctly.
          </li>
          <li>
            Keep instructions achievable within the reward you offer.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Review and approval expectations">
        <p>
          You are responsible for reviewing creator submissions in a timely
          manner. Only approved submissions accrue rewards.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Review submissions against the published brief, not new criteria.</li>
          <li>
            Where you reject a submission, give a clear, specific reason so the
            creator can revise.
          </li>
          <li>
            Do not withhold approval arbitrarily to avoid paying for legitimate
            verified views.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Prohibited briefs">
        <p>Campaign briefs must not ask creators to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Make false, exaggerated or unsubstantiated claims about a product.</li>
          <li>Hide or fail to disclose a paid partnership.</li>
          <li>
            Infringe intellectual property or use third-party assets without
            rights.
          </li>
          <li>
            Promote prohibited, unsafe or illegal goods or services, or target
            minors inappropriately.
          </li>
          <li>Manipulate views, engagement or platform metrics.</li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Brand verification">
        <p>
          Brands must verify their identity and business details before launching
          a campaign. Verification helps protect creators from fraudulent
          campaigns and helps us meet our obligations under Indian law.
        </p>
        <p>
          We may request business registration details and, where relevant, a
          GSTIN for invoicing. Verified brands are displayed with a verification
          indicator in the marketplace.
        </p>
      </LegalSection>

      <LegalSection title="7. Refunds and remaining budget">
        <p>
          Unused campaign budget that is not committed to approved rewards may be
          refunded to the brand when a campaign ends or is cancelled, in line with
          our Payment &amp; Refund Policy.
        </p>
        <p>
          Funds already committed to approved submissions or verified views are
          used to pay creators and are not refundable. Refunds, where applicable,
          are returned to the original payment method after any applicable
          deductions and are subject to the platform&apos;s review.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
