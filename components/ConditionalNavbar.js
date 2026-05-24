'use client';
import { usePathname } from 'next/navigation';
import Navbar from './Navbar';

export default function ConditionalNavbar() {
  const pathname = usePathname();

  // Hide top navbar on homepage since it has bottom nav
  if (pathname === '/') return null;

  return <Navbar />;
}