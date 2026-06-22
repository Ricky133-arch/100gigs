'use client';
/**
 * app/u/[username]/page.js
 * Resolves a custom username (e.g. /u/chidi-plumber)
 * and redirects to the user's full profile page.
 */
import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function UsernameRedirect() {
  const { username } = useParams();
  const router       = useRouter();

  useEffect(() => {
    if (!username) return;

    fetch(`/api/users/by-username?username=${username}`)
      .then(r => r.json())
      .then(data => {
        if (data._id) {
          router.replace(`/profile/${data._id}`);
        } else {
          router.replace('/404');
        }
      })
      .catch(() => router.replace('/404'));
  }, [username]);

  return (
    <div className="min-h-screen bg-[#080f0a] flex items-center justify-center">
      <div className="w-10 h-10 rounded-full border-2 border-green-500/20 border-t-green-500 animate-spin" />
    </div>
  );
}