import { usePathname } from "next/navigation";

export type StreamPrefix = "" | "/sale" | "/operational";

export function streamKeyFromPrefix(
  prefix: StreamPrefix
): "sale" | "operational" {
  return prefix === "/operational" ? "operational" : "sale";
}

export function getStreamPrefix(pathname: string | null): StreamPrefix {
  if (!pathname) return "";
  if (pathname === "/sale" || pathname.startsWith("/sale/")) return "/sale";
  if (pathname === "/operational" || pathname.startsWith("/operational/")) {
    return "/operational";
  }
  return "";
}

/** Prefix absolute paths when the user is under `/sale/*` or `/operational/*`. */
export function withStreamPrefix(
  prefix: StreamPrefix,
  path: string
): string {
  if (!prefix) return path;
  if (!path.startsWith("/")) return `${prefix}/${path}`;
  return `${prefix}${path}`;
}

export function useStreamPrefix(): StreamPrefix {
  const pathname = usePathname();
  return getStreamPrefix(pathname);
}
