'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { OperatorDashboard } from '@/components/OperatorDashboard';
import { useUser } from '@/firebase';
import { LogoSpinner } from '@/components/LogoSpinner';

const OPERATOR_COMPANY_KEY = 'fake_operator_company_id';

export default function OperatorDashboardPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();

  const [companyId, setCompanyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isUserLoading) {
      return; // Wait until user state is resolved
    }
    if (!user) {
      router.replace('/login'); // Not authenticated, redirect to login
      return;
    }
    
    // This now runs only on the client, after user state is confirmed
    const storedCompanyId = localStorage.getItem(OPERATOR_COMPANY_KEY);

    if (!storedCompanyId) {
      // If no company is selected, redirect to the selection page
      router.replace('/select-company');
    } else {
      setCompanyId(storedCompanyId);
      setIsLoading(false);
    }
  }, [user, isUserLoading, router]);

  if (isLoading || isUserLoading || !companyId || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <LogoSpinner />
      </div>
    );
  }

  return <OperatorDashboard companyId={companyId} />;
}
