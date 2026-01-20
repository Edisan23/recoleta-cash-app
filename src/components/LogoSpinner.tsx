'use client';

import { LogoIcon } from './icons/logo';
import { cn } from '@/lib/utils';

export function LogoSpinner({ className }: { className?: string }) {
  return (
    <LogoIcon
      className={cn('h-32 w-32', className)}
    />
  );
}
