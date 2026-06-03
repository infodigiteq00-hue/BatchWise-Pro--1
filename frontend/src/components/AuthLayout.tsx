import { Link } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { FlaskConical } from "lucide-react";

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <Toaster richColors position="top-right" />
      <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4 py-12">
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <FlaskConical className="h-7 w-7" />
        </div>
        <div className="text-sm font-bold tracking-wide text-foreground">RP INDUSTRIES</div>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
          BMR Issuance System
        </div>
      </div>
      <div className="w-full max-w-md rounded-lg border bg-card p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        )}
        <div className="mt-6">{children}</div>
      </div>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        <Link to="/login" className="underline-offset-4 hover:underline">
          Login
        </Link>
        {" · "}
        <Link to="/signup" className="underline-offset-4 hover:underline">
          Sign up
        </Link>
      </p>
    </div>
    </>
  );
}
