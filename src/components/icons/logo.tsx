import * as React from 'react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

type LogoIconProps = React.HTMLAttributes<HTMLDivElement> & {
    className?: string;
};

export function LogoIcon({
  className,
  ...props
}: LogoIconProps) {
  return (
    <div
      className={cn("relative h-8 w-8", className)}
      {...props}
    >
      <Image
        src="/logo.png"
        alt="Turno Pro Logo"
        fill
        sizes="64px"
        className="object-contain"
        priority
      />
    </div>
  );
}
