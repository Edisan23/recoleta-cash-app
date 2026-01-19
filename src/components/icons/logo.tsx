import * as React from 'react';
import { cn } from '@/lib/utils';

export function LogoIcon({
  className,
  ...props
}: React.ComponentProps<'img'>) {
  return (
    <img
      src="/favicon.ico"
      alt="Logo"
      className={cn("h-8 w-8", className)}
      {...props}
    />
  );
}
