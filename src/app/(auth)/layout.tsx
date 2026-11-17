import Link from "next/link";
import { Scissors } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <Link href="/" className="flex items-center justify-center gap-2 mb-8">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-900">
              <Scissors className="h-5 w-5 text-mint-400" />
            </span>
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
