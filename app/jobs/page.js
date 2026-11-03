/**
 * app/jobs/page.js
 * Old job list. /browse replaced it, so send anyone who lands here
 * (old links, bookmarks, Google results) to /browse, keeping any filters.
 * Individual jobs at /jobs/[id] are unaffected.
 */
import { redirect } from 'next/navigation';

export default async function Jobs({ searchParams }) {
  const params = new URLSearchParams();
  const sp = (await searchParams) || {};
  for (const [key, value] of Object.entries(sp)) {
    if (Array.isArray(value)) value.forEach((v) => params.append(key, v));
    else if (value != null) params.set(key, value);
  }
  const qs = params.toString();
  redirect(qs ? `/browse?${qs}` : '/browse');
}