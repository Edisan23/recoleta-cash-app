'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { OperatorDashboard } from '@/components/OperatorDashboard';
import { Loader2 } from 'lucide-react';

const OPERATOR_COMPANY_KEY = 'fake_operator_company_id';

export default function OperatorDashboardPage() {
  const router = useRouter();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const storedCompanyId = localStorage.getItem(OPERATOR_COMPANY_KEY);
      if (!storedCompanyId) {
        // If no company is selected, redirect to the selection page
        router.replace('/select-company');
      } else {
        setCompanyId(storedCompanyId);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Could not access localStorage:", error);
      router.replace('/select-company');
    }
  }, [router]);

  if (isLoading || !companyId) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return <OperatorDashboard companyId={companyId} />;
}
