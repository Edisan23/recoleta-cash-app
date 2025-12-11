'use client';

import { useState, useEffect } from 'react';
import { OperatorDashboard } from '@/components/OperatorDashboard';
import { LandingPage } from '@/components/LandingPage';
import { Loader2 } from 'lucide-react';

const OPERATOR_COMPANY_KEY = 'fake_operator_company_id';

export default function Home() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const storedCompanyId = localStorage.getItem(OPERATOR_COMPANY_KEY);
      setCompanyId(storedCompanyId);
    } catch (error) {
      console.error("Could not access localStorage:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (companyId) {
    return <OperatorDashboard companyId={companyId} />;
  }

  return <LandingPage />;
}
