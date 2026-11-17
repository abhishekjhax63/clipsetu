import type { Metadata } from "next";
import Link from "next/link";
import { LegalLayout, LegalSection } from "@/components/layout/legal-layout";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description:
    "How ClipSetu uses essential, preference and analytics cookies, and how to manage cookies in your browser.",
};

export default function CookiesPage() {
  return (
    <LegalLayout
      title="Cookie Policy"
      lastUpdated="14 November 2026"
      intro={`This Cookie Policy explains how ${APP_NAME} uses cookies and similar technologies, and the choices available to you.`}
    >
      <LegalSection title="1. What are cookies?">
        <p>
          Cookies are small text files stored on your device when you visit a
          website. They help the site remember your actions and preferences over
          time. We also use similar technologies such as local storage for the
          same purposes described below.
        </p>
      </LegalSection>

      <LegalSection title="2. Essential cookies">
        <p>
          These cookies are necessary for the platform to work. They keep you
          signed in, protect your session and help prevent fraud.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Authentication session</strong> — remembers that you are
            logged in so you do not have to sign in on every page.
          </li>
          <li>
            <strong>Security</strong> — helps protect against cross-site request
            forgery and other abuse.
          </li>
        </ul>
        <p>
          Essential cookies are required for login and cannot be switched off
          through the platform. If you block them in your browser, you may not be
          able to sign in or use the service.
        </p>
      </LegalSection>

      <LegalSection title="3. Preference cookies">
        <p>
          These cookies remember choices you make to personalise your experience,
          such as interface settings or a remembered filter. Disabling them may
          reset your preferences on your next visit.
        </p>
      </LegalSection>

      <LegalSection title="4. Analytics cookies">
        <p>
          We use analytics to understand how the platform is used so we can
          improve it — for example, which pages are visited and where errors
          occur. Analytics data is used in aggregate and helps us make product
          decisions.
        </p>
        <p>
          Where required, analytics cookies are set only with your consent, and
          you can withdraw that consent at any time.
        </p>
      </LegalSection>

      <LegalSection title="5. Managing cookies">
        <p>
          You can control and delete cookies through your browser settings. Most
          browsers let you block all cookies, block third-party cookies, or be
          notified when a cookie is set. The exact steps vary by browser:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Open your browser&apos;s settings or preferences.</li>
          <li>Find the privacy or security section.</li>
          <li>Adjust the cookie and site data options as you prefer.</li>
        </ul>
        <p>
          Note that blocking essential cookies will prevent you from signing in.
        </p>
      </LegalSection>

      <LegalSection title="6. Changes and contact">
        <p>
          We may update this policy from time to time and will revise the
          &quot;last updated&quot; date above. For more on how we handle personal
          data, see our{" "}
          <Link
            href="/privacy"
            className="font-medium text-ink-900 underline-offset-4 hover:underline"
          >
            Privacy Policy
          </Link>
          . If you have questions, please{" "}
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
