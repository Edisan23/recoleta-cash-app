import * as React from 'react';
import { cn } from '@/lib/utils';

type LogoIconProps = React.HTMLAttributes<HTMLDivElement> & {
    className?: string;
};

export function LogoIcon({
  className,
  ...props
}: LogoIconProps) {
  return (
    <div
      style={{
        maskImage: 'url(/favicon.svg)',
        WebkitMaskImage: 'url(/favicon.svg)',
        maskSize: 'contain',
        WebkitMaskSize: 'contain',
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
        maskPosition: 'center',
        WebkitMaskPosition: 'center',
        backgroundColor: 'currentColor'
      }}
      className={cn(
        "h-8 w-8 text-foreground", // Use text color to control the icon color
        className
      )}
      {...props}
    />
  );
}
