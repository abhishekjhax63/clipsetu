import type { Metadata } from "next";
import Link from "next/link";
import { LegalLayout, LegalSection } from "@/components/layout/legal-layout";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How ClipSetu collects, uses, shares and protects personal data, including your rights under India's DPDP Act 2023.",
};

export default function PrivacyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      lastUpdated="14 November 2026"
      intro={`This Privacy Policy explains how ${APP_NAME} collects, uses and protects your personal data when you use the platform.`}
    >
      <LegalSection title="1. Overview">
        <p>
          {APP_NAME} is committed to handling personal data responsibly and in
          line with applicable Indian law, including the Digital Personal Data
          Protection Act, 2023 (the &quot;DPDP Act&quot;). This policy describes
          what we collect, why we collect it, who we share it with and the choices
          you have.
        </p>
      </LegalSection>

      <LegalSection title="2. Data we collect">
        <p>We collect the following categories of information:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Account data</strong> — name, email address, login
            credentials and role.
          </li>
          <li>
            <strong>Profile data</strong> — display name, bio, location and
            profile image.
          </li>
          <li>
            <strong>KYC and verification data</strong> — the information and
            documents needed to verify your identity or business.
          </li>
          <li>
            <strong>Social handles</strong> — connected platform accounts and
            public profile details used to confirm ownership and verify views.
          </li>
          <li>
            <strong>Payment references</strong> — payout account details and
            references from our payment providers (we do not store full card
            numbers).
          </li>
          <li>
            <strong>Usage and device data</strong> — how you interact with the
            platform, plus device, browser and approximate location information.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. How we use your data">
        <ul className="list-disc space-y-2 pl-5">
          <li>Create and manage your account and the features of your role.</li>
          <li>Operate campaigns, review submissions and verify views.</li>
          <li>Process rewards, withdrawals and payments.</li>
          <li>Prevent fraud, fake engagement and abuse.</li>
          <li>Provide support and respond to your requests.</li>
          <li>Comply with legal and regulatory obligations.</li>
          <li>Improve the platform and, with consent where required, send updates.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Legal bases and the DPDP Act 2023">
        <p>
          Under the DPDP Act, we process personal data on the basis of your
          consent and/or for certain legitimate uses permitted by law. Where we
          rely on consent, you may withdraw it at any time; this will not affect
          processing that already took place.
        </p>
        <p>
          Some processing is necessary to provide the service you have requested
          (for example, processing a withdrawal) or to meet legal obligations
          such as tax and anti-fraud requirements.
        </p>
      </LegalSection>

      <LegalSection title="5. Sharing with processors and partners">
        <p>
          We share personal data only as needed to run the platform, and requires
          our service providers to protect it. Categories of recipients include:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Hosting and database</strong> — Supabase, used for
            authentication, storage and data.
          </li>
          <li>
            <strong>Email provider</strong> — used to send transactional and
            account emails.
          </li>
          <li>
            <strong>Payment provider</strong> — used to process brand deposits and
            creator payouts.
          </li>
          <li>
            <strong>Social platform APIs</strong> — used to confirm ownership and
            retrieve view counts for verification.
          </li>
        </ul>
        <p>
          We may also disclose data where required by law or to protect the
          rights, safety and security of {APP_NAME} and its users.
        </p>
      </LegalSection>

      <LegalSection title="6. Cookies">
        <p>
          We use cookies and similar technologies to keep you signed in, remember
          preferences and understand how the platform is used. See our{" "}
          <Link
            href="/cookies"
            className="font-medium text-ink-900 underline-offset-4 hover:underline"
          >
            Cookie Policy
          </Link>{" "}
          for details and how to manage them.
        </p>
      </LegalSection>

      <LegalSection title="7. Data security">
        <p>
          We use technical and organisational measures to protect personal data,
          including access controls, row-level security in our database and
          encrypted storage of sensitive tokens. We never store your social
          account passwords.
        </p>
        <p>
          No method of transmission or storage is completely secure. If we become
          aware of a breach affecting your personal data, we will notify you and
          the relevant authorities as required by law.
        </p>
      </LegalSection>

      <LegalSection title="8. Retention">
        <p>
          We keep personal data only as long as necessary for the purposes
          described in this policy, to comply with legal obligations (such as tax
          and accounting rules) and to resolve disputes. When data is no longer
          needed, we delete or anonymise it.
        </p>
      </LegalSection>

      <LegalSection title="9. Your rights">
        <p>Subject to applicable law, you have the right to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Access the personal data we hold about you.</li>
          <li>Request correction of inaccurate or incomplete data.</li>
          <li>Request deletion of your data, where applicable.</li>
          <li>Withdraw consent where processing is based on consent.</li>
          <li>Raise a grievance with our grievance officer (see below).</li>
        </ul>
        <p>
          To exercise these rights,{" "}
          <Link
            href="/contact"
            className="font-medium text-ink-900 underline-offset-4 hover:underline"
          >
            contact us
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="10. Grievance officer">
        <p>
          In accordance with the DPDP Act, you may contact our grievance officer
          about any concern relating to the processing of your personal data. You
          can reach the grievance officer by{" "}
          <Link
            href="/contact"
            className="font-medium text-ink-900 underline-offset-4 hover:underline"
          >
            contacting us
          </Link>
          ; we will acknowledge and respond within the timeframes required by law.
        </p>
      </LegalSection>

      <LegalSection title="11. Children">
        <p>
          {APP_NAME} is intended for users who are 18 years of age or older. We do
          not knowingly collect personal data from children. If we learn that we
          have collected data from someone under 18, we will take steps to delete
          it.
        </p>
      </LegalSection>

      <LegalSection title="12. International transfers">
        <p>
          Some of our service providers may store or process data outside India.
          Where personal data is transferred internationally, we take steps to
          ensure it remains protected in line with the DPDP Act and applicable
          law.
        </p>
      </LegalSection>

      <LegalSection title="13. Changes to this policy">
        <p>
          We may update this policy from time to time. Material changes will be
          notified through the platform or by email, and we will update the
          &quot;last updated&quot; date above.
        </p>
      </LegalSection>

      <LegalSection title="14. Contact">
        <p>
          For any questions about this policy or your personal data, please{" "}
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
