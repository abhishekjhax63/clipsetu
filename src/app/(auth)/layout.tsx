import Image from "next/image";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <Link
            href="/"
            aria-label="ClipSetu home"
            className="flex items-center justify-center gap-2.5 mb-8"
          >
            <Image
              src="/brand/clipsetu-mark.png"
              alt=""
              width={44}
              height={44}
              priority
              className="h-11 w-11 object-contain"
            />
            <span className="text-2xl font-bold tracking-tight text-ink-900">
              Clip<span className="text-mint-600">Setu</span>
            </span>
          </Link>
          {children}
        </div>
      </div>
    </div>
  );
}
