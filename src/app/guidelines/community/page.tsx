import type { Metadata } from "next";
import { LegalLayout, LegalSection } from "@/components/layout/legal-layout";

export const metadata: Metadata = {
  title: "Community Guidelines",
  description:
    "ClipSetu Community Guidelines: respect, no misinformation, no spam or fake engagement, intellectual property, enforcement and reporting.",
};

export default function CommunityGuidelinesPage() {
  return (
    <LegalLayout
      title="Community Guidelines"
      lastUpdated="14 November 2026"
      intro="ClipSetu is a marketplace for creators and brands across India. These guidelines set the standard of behaviour we expect from everyone on the platform."
    >
      <LegalSection title="1. Respect and no harassment">
        <p>
          Treat other creators, brands and our team with respect. Disagreements
          are fine; abuse is not.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            No harassment, threats, hate speech or discrimination of any kind.
          </li>
          <li>
            No doxxing, sharing private information, or unwanted contact.
          </li>
          <li>
            Critique work, not people. Keep feedback specific and constructive.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="2. No misinformation">
        <p>
          Do not post or submit content that is false, misleading or deceptive.
          This includes fabricated claims about products or brands, falsified
          results, and content designed to deceive viewers or the platform.
        </p>
        <p>
          Do not misuse campaign materials to imply an endorsement or partnership
          that does not exist.
        </p>
      </LegalSection>

      <LegalSection title="3. No spam or fake engagement">
        <p>
          Authentic attention is the foundation of ClipSetu. Do not attempt to
          inflate metrics or manipulate the platform.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            No bought views, bots, engagement pods, click farms or incentivised
            interactions.
          </li>
          <li>
            No repeatedly submitting the same or near-identical content to game
            campaigns.
          </li>
          <li>
            No unsolicited promotions, scams or bulk messaging.
          </li>
        </ul>
        <p>
          Views that are found to be artificially inflated do not earn rewards
          and may be reversed.
        </p>
      </LegalSection>

      <LegalSection title="4. Intellectual property">
        <p>
          Only upload or submit content you have the right to use. Respect
          copyright, trademark, and the privacy and publicity rights of others.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Do not use third-party music, footage or images without permission.</li>
          <li>Do not remove watermarks or attribution required by a licence.</li>
          <li>
            Respond promptly if we contact you about a rights or takedown issue.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Enforcement">
        <p>
          We apply a graduated approach when the guidelines are broken. The
          response depends on the severity and frequency of the issue; serious
          harm may lead to immediate and permanent action.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Warning</strong> — for first or minor issues, we explain what
            went wrong and what to change.
          </li>
          <li>
            <strong>Restriction</strong> — temporary limits on joining campaigns,
            submitting content or withdrawing funds while an issue is addressed.
          </li>
          <li>
            <strong>Suspension</strong> — temporary or permanent removal of access
            for repeated or serious violations, including fraud or fake
            engagement.
          </li>
        </ul>
        <p>
          Where an action affects your account, we aim to tell you why. If you
          believe a decision was mistaken, you can appeal (see Reporting below).
        </p>
      </LegalSection>

      <LegalSection title="6. Reporting">
        <p>
          If you see content or behaviour that breaks these guidelines, report it
          through the platform or contact us. Please include links, screenshots
          and a short description so we can investigate.
        </p>
        <p>
          We review reports and take action where warranted. Reports made in good
          faith are protected; knowingly false reports may themselves lead to
          enforcement.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
