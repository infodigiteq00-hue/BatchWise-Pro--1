export type DownloadPlatform = "windows" | "mac" | "linux" | "unknown";

const DEFAULT_REPO = "infodigiteq00-hue/BatchWise-Pro--1";

/** Base URL for latest release assets (no trailing slash). */
export function getReleaseDownloadBase(): string {
  const custom = import.meta.env.VITE_RELEASE_DOWNLOAD_BASE as string | undefined;
  if (custom?.trim()) return custom.replace(/\/$/, "");
  const repo =
    (import.meta.env.VITE_GITHUB_REPO as string | undefined)?.trim() ||
    DEFAULT_REPO;
  return `https://github.com/${repo}/releases/latest/download`;
}

/** Filenames must match electron-builder `artifactName` in desktop/package.json */
export const RELEASE_ARTIFACTS: Record<
  Exclude<DownloadPlatform, "unknown">,
  { file: string; label: string; hint: string }
> = {
  windows: {
    file: "BatchWise-Pro-Windows-Setup.exe",
    label: "Windows",
    hint: "Windows 10/11 (64-bit)",
  },
  mac: {
    file: "BatchWise-Pro-macOS.dmg",
    label: "macOS",
    hint: "macOS 11+ (Apple Silicon)",
  },
  linux: {
    file: "BatchWise-Pro-Linux.deb",
    label: "Linux",
    hint: "Debian/Ubuntu 64-bit (.deb)",
  },
};

export function detectPlatform(): DownloadPlatform {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent.toLowerCase();
  const platform = (
    navigator as Navigator & { userAgentData?: { platform?: string } }
  ).userAgentData?.platform?.toLowerCase();
  if (ua.includes("win") || platform === "windows") return "windows";
  if (ua.includes("mac") || platform === "macos") return "mac";
  if (ua.includes("linux") || platform === "linux") return "linux";
  return "unknown";
}

export function getDownloadUrl(platform: Exclude<DownloadPlatform, "unknown">) {
  const { file } = RELEASE_ARTIFACTS[platform];
  return `${getReleaseDownloadBase()}/${file}`;
}
