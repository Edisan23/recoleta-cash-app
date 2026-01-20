'use client';

import { LogoIcon } from './icons/logo';
import { cn } from '@/lib/utils';

export function LogoSpinner({ className }: { className?: string }) {
  return (
    <LogoIcon
      className={cn('h-24 w-24 animate-spin', className)}
    />
  );
}
