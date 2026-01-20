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
      <div className="absolute top-[66%] left-[38%] w-5 h-5">
        <Image
            src="/farola_blanca_off.png"
            alt="Faro izquierdo apagado"
            fill
            className="object-contain"
            priority
        />
        <Image
            src="/farola_blanca_on.png"
            alt="Faro izquierdo parpadeando"
            fill
            className="object-contain animate-light-blink"
            priority
        />
      </div>
      {/* Right Headlight */}
      <div className="absolute top-[66%] right-[23%] w-5 h-5">
        <Image
            src="/farola_blanca_off.png"
            alt="Faro derecho apagado"
            fill
            className="object-contain"
            priority
        />
        <Image
            src="/farola_blanca_on.png"
            alt="Faro derecho parpadeando"
            fill
            className="object-contain animate-light-blink"
            priority
        />
      </div>
    </div>
  );
}
