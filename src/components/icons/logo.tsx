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
    <div className={cn("relative h-8 w-8", className)}>
      <Image
        src="/favicon.ico"
        alt="Logo"
        fill
        sizes="4rem"
        style={{ objectFit: 'contain' }}
        {...props}
      />
    </div>
  );
}
