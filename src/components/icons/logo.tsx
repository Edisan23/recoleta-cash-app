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
      <div className="absolute top-[68%] left-[30%] w-[6px] h-[6px]">
        <Image
            src="/farola_blanca_on.png"
            alt="Faro izquierdo"
            fill
            className="object-contain drop-shadow-[0_0_1px_rgba(0,0,0,0.9)]"
        />
      </div>
      {/* Right Headlight */}
      <div className="absolute top-[68%] right-[30%] w-[6px] h-[6px]">
        <Image
            src="/farola_blanca_on.png"
            alt="Faro derecho"
            fill
            className="object-contain drop-shadow-[0_0_1px_rgba(0,0,0,0.9)]"
        />
      </div>
    </div>
  );
}
