'use client';

import { LogoIcon } from './icons/logo';
import { cn } from '@/lib/utils';

export function LogoSpinner({ className, ...props }: React.ComponentProps<'img'>) {
  return (
    <LogoIcon
      className={cn('h-10 w-10 animate-spin', className)}
      {...props}
    />
  );
}
