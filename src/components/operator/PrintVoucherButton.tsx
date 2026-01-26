'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

// This component is intentionally left blank as the history feature has been removed.
export const PrintVoucherButton: React.FC<any> = () => {
    return (
        <Button disabled>
            <Download className="mr-2 h-4 w-4" />
            Descargar Comprobante
        </Button>
    );
};
