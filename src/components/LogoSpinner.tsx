'use client';

import { cn } from '@/lib/utils';
import Image from 'next/image';

export function LogoSpinner({ className }: { className?: string }) {
  return (
    <div className={cn('relative h-32 w-32', className)}>
      <Image
        src="/favicon.png"
        alt="Camión base"
        fill
        sizes="128px"
        className="object-contain"
        priority
      />
      {/* Left Headlight */}
      <div className="absolute top-[58%] left-[25%] w-5 h-5">
        <Image
            src="/farola_blanca_on.png"
            alt="Faro izquierdo parpadeando"
            fill
            className="object-contain animate-light-blink drop-shadow-[0_0_2px_rgba(0,0,0,0.7)]"
        />
      </div>
      {/* Right Headlight */}
      <div className="absolute top-[58%] right-[25%] w-5 h-5">
        <Image
            src="/farola_blanca_on.png"
            alt="Faro derecho parpadeando"
            fill
            className="object-contain animate-light-blink drop-shadow-[0_0_2px_rgba(0,0,0,0.7)]"
        />
      </div>
    </div>
  );
}
