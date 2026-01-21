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
      className={cn("relative h-8 w-8", className)}
      {...props}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/favicon.png"
        alt="Turno Pro Logo - Camión"
        className="object-contain"
        style={{ position: 'absolute', height: '100%', width: '100%', left: 0, top: 0, right: 0, bottom: 0 }}
      />
       {/* Left Headlight */}
      <div className="absolute top-[58%] left-[25%] w-[6px] h-[6px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
            src="/farola_blanca_on.png"
            alt="Faro izquierdo"
            className="object-contain drop-shadow-[0_0_1px_rgba(0,0,0,0.9)]"
            style={{ position: 'absolute', height: '100%', width: '100%', left: 0, top: 0, right: 0, bottom: 0 }}
        />
      </div>
      {/* Right Headlight */}
      <div className="absolute top-[58%] right-[25%] w-[6px] h-[6px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
            src="/farola_blanca_on.png"
            alt="Faro derecho"
            className="object-contain drop-shadow-[0_0_1px_rgba(0,0,0,0.9)]"
            style={{ position: 'absolute', height: '100%', width: '100%', left: 0, top: 0, right: 0, bottom: 0 }}
        />
      </div>
    </div>
  );
}
