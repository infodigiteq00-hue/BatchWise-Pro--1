import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { AuthLayout } from "@/components/AuthLayout";
import {
  detectPlatform,
  getDownloadUrl,
  RELEASE_ARTIFACTS,
  type DownloadPlatform,
} from "@/lib/downloads";
import { Download, Monitor } from "lucide-react";

export const Route = createFileRoute("/download")({
  component: DownloadPage,
});

const PLATFORMS = ["windows", "mac", "linux"] as const;

function DownloadPage() {
  const detected = useMemo(
    () => (typeof window !== "undefined" ? detectPlatform() : "unknown"),
    [],
  );

  return (
    <AuthLayout
      title="Download desktop app"
      subtitle="Install on your PC. BMR data stays on your machine — account login and pause are checked with Digiteq online."
    >
      <div className="space-y-4">
        {detected !== "unknown" && (
          <PrimaryDownload platform={detected} />
        )}

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">All platforms</p>
          <ul className="space-y-2">
            {PLATFORMS.map((platform) => (
              <PlatformRow
                key={platform}
                platform={platform}
                highlighted={platform === detected}
              />
            ))}
          </ul>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          Sign in with the same email and password you use in the browser. Your
          templates and BMR files are saved locally on this computer. If your
          account is paused by Digiteq, the app will stop working here too
          (internet required at sign-in).
        </p>

        <p className="text-center text-sm text-muted-foreground">
          Already installed?{" "}
          <Link
            to="/login"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}

function PrimaryDownload({ platform }: { platform: DownloadPlatform }) {
  if (platform === "unknown") return null;
  const meta = RELEASE_ARTIFACTS[platform];
  return (
    <a
      href={getDownloadUrl(platform)}
      className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 transition-colors hover:bg-primary/10"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Download className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">
          Download for {meta.label}
        </p>
        <p className="text-xs text-muted-foreground">{meta.hint}</p>
      </div>
      <span className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
        Download
      </span>
    </a>
  );
}

function PlatformRow({
  platform,
  highlighted,
}: {
  platform: (typeof PLATFORMS)[number];
  highlighted: boolean;
}) {
  const meta = RELEASE_ARTIFACTS[platform];
  return (
    <li
      className={
        highlighted
          ? "rounded-md border border-primary/20 bg-muted/40 px-3 py-2"
          : "rounded-md border px-3 py-2"
      }
    >
      <a
        href={getDownloadUrl(platform)}
        className="flex items-center gap-3 text-sm hover:opacity-90"
      >
        <Monitor className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="flex-1">
          <span className="font-medium text-foreground">{meta.label}</span>
          <span className="block text-xs text-muted-foreground">{meta.hint}</span>
        </span>
        <span className="text-xs font-medium text-primary">Download</span>
      </a>
    </li>
  );
}
