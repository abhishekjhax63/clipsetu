import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { AnnouncementBanner } from "./announcement-banner";

interface PublicLayoutProps {
  children: React.ReactNode;
  /** Override the default footer (e.g. the homepage's signature footer). */
  footer?: React.ReactNode;
}

export function PublicLayout({ children, footer }: PublicLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <AnnouncementBanner />
      <main className="flex-1">{children}</main>
      {footer ?? <SiteFooter />}
    </div>
  );
}
