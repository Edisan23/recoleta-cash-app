import * as React from 'react';
import { cn } from '@/lib/utils';
import { Truck } from 'lucide-react';

export function LogoIcon({
  className,
  ...props
}: React.ComponentProps<'svg'>) {
  return (
    <Truck
      className={cn('', className)}
      {...props}
    />
  );
}
