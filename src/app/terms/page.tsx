import type { Metadata } from "next";
import Link from "next/link";
import { LegalLayout, LegalSection } from "@/components/layout/legal-layout";
import { APP_NAME, MIN_WITHDRAWAL_INR, PLATFORM_FEE_PERCENT } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "The terms governing your use of ClipSetu — eligibility, accounts, campaigns, payments, intellectual property, liability and jurisdiction.",
};

export default function TermsPage() {
  return (
    <LegalLayout
      title="Terms & Conditions"
      lastUpdated="14 November 2026"
      intro={`These Terms & Conditions govern your access to and use of ${APP_NAME}. By creating an account or using the platform, you agree to be bound by them.`}
    >
      <LegalSection title="1. Acceptance of these terms">
        <p>
          By accessing or using {APP_NAME}, you confirm that you have read,
          understood and agree to these Terms & Conditions, our Privacy Policy and
          our Community Guidelines. If you do not agree, do not use the platform.
        </p>
      </LegalSection>

      <LegalSection title="2. Eligibility">
        <p>
          You must be at least 18 years old to use {APP_NAME}, and you must be at
          least 18 to take part in paid campaigns and to withdraw earnings. By
          using the platform you represent that you meet these requirements.
        </p>
        <p>
          You agree to provide accurate, current and complete information about
          yourself and to keep it up to date. Providing false information, or
          impersonating another person or brand, may result in suspension.
        </p>
      </LegalSection>

      <LegalSection title="3. Accounts and roles">
        <p>
          You are responsible for the activity on your account and for keeping
          your login credentials secure. Accounts may operate as a creator, a
          brand, or both, subject to separate verification requirements for each
          role.
        </p>
        <p>
          We may require identity or business verification (KYC) before enabling
          certain features, such as launching a campaign or withdrawing funds.
        </p>
      </LegalSection>

      <LegalSection title="4. Brands">
        <p>
          Brands are responsible for the campaigns they publish. A campaign must
          be funded before it goes live; funds are held for creator rewards and
          released as eligible views are verified.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Reward rates, caps and eligibility rules are fixed at launch and are
            not applied retroactively to accepted submissions.
          </li>
          <li>
            Brands review submissions and must give reasons when rejecting them.
          </li>
          <li>
            Brands must own or be licensed to share all source materials they
            upload.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Creators">
        <p>
          Creators join campaigns, create clips from the provided source material
          and submit published post URLs. Submissions are subject to review and to
          view verification through official platform APIs.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Rewards are based on eligible verified views; see the Creator
            Guidelines and Payment &amp; Refund Policy.
          </li>
          <li>
            {APP_NAME} does not guarantee any particular level of views, approval
            or earnings. Campaign results depend on many factors outside our
            control.
          </li>
          <li>
            Creators must disclose paid partnerships and comply with platform
            rules and applicable law.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Payments, fees and taxes">
        <p>
          {APP_NAME} applies a platform fee of {PLATFORM_FEE_PERCENT}% on creator
          earnings. The fee percentage may be configured and will be shown clearly
          before you accept campaign terms.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            The minimum withdrawal amount is ₹{MIN_WITHDRAWAL_INR}, and KYC
            verification is required before withdrawal.
          </li>
          <li>
            Payments and payouts are processed through third-party payment
            providers; their terms and timelines apply.
          </li>
          <li>
            You are responsible for any taxes applicable to your earnings,
            including income tax, GST and TDS where relevant.
          </li>
        </ul>
        <p>
          See our{" "}
          <Link
            href="/payments"
            className="font-medium text-ink-900 underline-offset-4 hover:underline"
          >
            Payment &amp; Refund Policy
          </Link>{" "}
          for full details.
        </p>
      </LegalSection>

      <LegalSection title="7. Intellectual property and licences">
        <p>
          The {APP_NAME} platform, its branding and its software are owned by us
          or our licensors and are protected by law. We grant you a limited,
          non-exclusive, non-transferable licence to use the platform for its
          intended purpose.
        </p>
        <p>
          You retain ownership of the content you create, but you grant us a
          licence to host, display, reproduce and share your submissions within
          the platform and with the relevant brand for the purposes of operating
          and promoting the campaign.
        </p>
      </LegalSection>

      <LegalSection title="8. Prohibited conduct">
        <p>You must not:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Break any applicable law or platform terms of service.</li>
          <li>Manipulate views, engagement, verification or payments.</li>
          <li>Upload content that is unlawful, harmful or infringing.</li>
          <li>Attempt to access data or accounts you are not authorised to access.</li>
          <li>Interfere with the security or integrity of the platform.</li>
        </ul>
      </LegalSection>

      <LegalSection title="9. Disclaimers">
        <p>
          The platform is provided on an &quot;as is&quot; and &quot;as
          available&quot; basis. To the maximum extent permitted by law, we
          disclaim all warranties, whether express or implied, including fitness
          for a particular purpose. We do not warrant that the platform will be
          uninterrupted, error-free or that any campaign will achieve a particular
          outcome.
        </p>
      </LegalSection>

      <LegalSection title="10. Limitation of liability">
        <p>
          To the maximum extent permitted by law, {APP_NAME} and its officers,
          employees and partners will not be liable for any indirect, incidental,
          special or consequential damages, or for any loss of profits, data or
          goodwill, arising from your use of the platform.
        </p>
        <p>
          Where liability cannot be excluded, our total aggregate liability is
          limited to the greater of the fees you paid to us in the preceding
          twelve months or ₹1,000.
        </p>
      </LegalSection>

      <LegalSection title="11. Suspension and termination">
        <p>
          We may suspend or terminate your access if you breach these terms or our
          guidelines, if required by law, or to protect the platform and its
          users. You may stop using the platform at any time.
        </p>
        <p>
          On termination, provisions that by their nature should survive will
          continue to apply, including those on intellectual property, payments,
          disclaimers and liability.
        </p>
      </LegalSection>

      <LegalSection title="12. Governing law and jurisdiction">
        <p>
          These terms are governed by the laws of India. Subject to applicable
          law, the courts of India will have exclusive jurisdiction over any
          dispute arising from or relating to these terms or the platform.
        </p>
      </LegalSection>

      <LegalSection title="13. Changes to these terms">
        <p>
          We may update these terms from time to time. Material changes will be
          notified through the platform or by email before they take effect.
          Continued use of the platform after changes take effect constitutes
          acceptance of the updated terms.
        </p>
      </LegalSection>

      <LegalSection title="14. Contact">
        <p>
          For questions about these terms, please{" "}
          <Link
            href="/contact"
            className="font-medium text-ink-900 underline-offset-4 hover:underline"
          >
            contact us
          </Link>
          .
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
