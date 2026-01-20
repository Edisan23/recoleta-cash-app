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
        src="/favicon.png"
        alt="Turno Pro Logo - Camión"
        fill
        sizes="128px"
        className="object-contain"
        priority
      />
       {/* Left Headlight */}
      <div className="absolute top-[66%] left-[38%] w-[6px] h-[6px]">
        <Image
            src="/farola_blanca_on.png"
            alt="Faro izquierdo"
            fill
            className="object-contain"
            priority
        />
      </div>
      {/* Right Headlight */}
      <div className="absolute top-[66%] right-[23%] w-[6px] h-[6px]">
        <Image
            src="/farola_blanca_on.png"
            alt="Faro derecho"
            fill
            className="object-contain"
            priority
        />
      </div>
    </div>
  );
}
