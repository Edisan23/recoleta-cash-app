'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { OperatorDashboard } from '@/components/OperatorDashboard';
import { Loader2 } from 'lucide-react';

const OPERATOR_COMPANY_KEY = 'fake_operator_company_id';

export default function Home() {
  const router = useRouter();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const companyId = localStorage.getItem(OPERATOR_COMPANY_KEY);
      if (companyId) {
        setSelectedCompanyId(companyId);
      } else {
        // If no company is selected, redirect to the selection page
        router.replace('/select-company');
      }
    } catch (error) {
      console.error("Could not access localStorage", error);
      // Fallback or show an error, for now, we just stop loading
    } finally {
        // A small delay to prevent flickering if the redirect is too fast
        setTimeout(() => setIsLoading(false), 200);
    }
  }, [router]);

  if (isLoading || !selectedCompanyId) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // If a company is selected, show the dashboard
  return <OperatorDashboard companyId={selectedCompanyId} />;
}
