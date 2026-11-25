const fallback = "https://ibiza-admin-blue.vercel.app";

export function adminUrl(path: string) {
  return new URL(path, process.env.NEXT_PUBLIC_ADMIN_APP_URL || fallback).toString();
}
