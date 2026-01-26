'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogoSpinner } from '@/components/LogoSpinner';

// This page's sole purpose is to redirect to the dashboard,
// as the main history list view has been removed.
export default function HistoryRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/operator/dashboard');
  }, [router]);

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <LogoSpinner />
    </div>
  );
}
