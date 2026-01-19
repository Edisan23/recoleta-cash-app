import * as React from 'react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

type LogoIconProps = Omit<React.ComponentProps<typeof Image>, 'src' | 'alt' | 'fill'> & {
    className?: string;
};

export function LogoIcon({
  className,
  ...props
}: LogoIconProps) {
  return (
    <img
      src="/favicon.svg"
      alt="Logo"
      className={cn("h-8 w-8 object-contain", className)}
      {...props}
    />
  );
}
