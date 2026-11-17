import type { Metadata } from "next";
import { LegalLayout, LegalSection } from "@/components/layout/legal-layout";

export const metadata: Metadata = {
  title: "Creator Guidelines",
  description:
    "ClipSetu creator guidelines: eligibility, content quality, disclosures, rights, prohibited content, view verification and disputes.",
};

export default function CreatorGuidelinesPage() {
  return (
    <LegalLayout
      title="Creator Guidelines"
      lastUpdated="14 November 2026"
      intro="These guidelines explain what we expect from creators who join campaigns and submit clips on ClipSetu. They apply alongside our Terms & Conditions and Community Guidelines."
    >
      <LegalSection title="1. Eligibility">
        <p>
          You must be at least 18 years old to participate in paid campaigns and
          to withdraw earnings on ClipSetu. Accounts that cannot confirm their
          age are limited to previewing campaigns and cannot earn or withdraw.
        </p>
        <p>
          You must provide accurate account and profile information, connect only
          social accounts you own or are authorised to operate, and complete
          identity verification (KYC) before any withdrawal.
        </p>
      </LegalSection>

      <LegalSection title="2. Content quality expectations">
        <p>
          Clips should be deliberate, well-edited and fit for public viewing.
          Brand source material must be used in a way that reflects the campaign
          brief rather than simple re-uploads.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Follow the campaign brief, format and platform requirements.</li>
          <li>Keep the brand message recognisable; do not distort it.</li>
          <li>Use good taste in audio, captions and on-screen text.</li>
          <li>
            Avoid re-exporting content that is materially identical across many
            submissions.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Disclosure requirements">
        <p>
          Paid partnerships must be disclosed clearly. Where your content is
          sponsored, include an unambiguous disclosure that is visible without
          expanding captions — for example a &quot;Paid partnership with
          [brand]&quot; label, or the hashtag <strong>#ad</strong> in the
          caption and on-screen where practical.
        </p>
        <p>
          You are responsible for complying with the advertising disclosure rules
          of each platform and with applicable Indian law, including the
          guidelines for influencer advertising issued by the Advertising
          Standards Council of India (ASCI).
        </p>
      </LegalSection>

      <LegalSection title="4. Original content & rights">
        <p>
          You must have the right to publish everything in your clip. Only use
          source material that the brand has provided for the campaign, or assets
          you own or are licensed to use.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Do not use third-party music, footage or imagery you do not have
            permission to use.
          </li>
          <li>
            Do not remove or obscure watermarks, credit or attribution required
            by a licence.
          </li>
          <li>
            By submitting, you confirm you hold the necessary rights to the
            content you publish.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Prohibited content">
        <p>The following are not permitted in any submission:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Content that is hateful, harassing, violent or sexually explicit.</li>
          <li>Misleading claims, false endorsements or deceptive edits.</li>
          <li>
            Content that infringes intellectual property, privacy or publicity
            rights.
          </li>
          <li>
            Content that targets minors inappropriately or promotes illegal
            products or activities.
          </li>
          <li>
            Any attempt to manipulate views, engagement or verification (see
            section 6).
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Platform-rule compliance & fair play">
        <p>
          You must follow the terms of service and community rules of every
          platform you publish on, as well as any campaign-specific rules shown
          on the campaign page.
        </p>
        <p>
          Artificial inflation of views or engagement — including bought views,
          bots, engagement pods, click farms or incentivised interactions — is
          strictly prohibited. Clips found to use such methods do not earn
          rewards, and accounts may be suspended.
        </p>
      </LegalSection>

      <LegalSection title="7. How views are verified">
        <p>
          We retrieve view counts through official platform APIs for supported
          platforms. We do not scrape private data and we do not manually inflate
          numbers. Only views reported by the platform API and eligible under the
          campaign rules count towards rewards.
        </p>
        <p>
          Verification may take up to 24–48 hours after submission. Views that
          arrive after a campaign ends, or that fall outside the campaign window,
          may not be eligible.
        </p>
      </LegalSection>

      <LegalSection title="8. How rewards are calculated">
        <p>
          At a high level, rewards are based on eligible verified views over a
          campaign&apos;s reward period:
        </p>
        <p className="rounded-xl border border-border-soft bg-surface-soft p-4 font-mono text-ink-900">
          (eligible verified views ÷ 1,000) × campaign reward rate
        </p>
        <p>
          Each campaign sets its own reward rate and a maximum reward cap.
          Rewards are credited to your wallet once a submission is approved and
          views are verified. A platform fee applies to creator earnings; see the
          Payment &amp; Refund Policy for details.
        </p>
      </LegalSection>

      <LegalSection title="9. Appeals and disputes">
        <p>
          If you believe a submission was incorrectly rejected, or that verified
          views are wrong, you can raise a dispute from the submission within the
          review window shown on the campaign page.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Provide the submission URL and any supporting information.</li>
          <li>
            Disputes are reviewed by our moderation team, which may consult the
            brand where relevant.
          </li>
          <li>
            We aim to resolve disputes promptly; outcomes are communicated in the
            platform.
          </li>
        </ul>
        <p>
          Abusing the dispute process — for example repeated bad-faith appeals —
          may lead to restrictions on your account.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
