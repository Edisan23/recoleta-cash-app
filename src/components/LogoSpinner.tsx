'use client';

import { cn } from '@/lib/utils';
import Image from 'next/image';

export function LogoSpinner({ className }: { className?: string }) {
  return (
    <div className={cn('relative h-32 w-32', className)}>
      <Image
        src="/farola_blanca_off.png"
        alt="Farola apagada"
        fill
        sizes="128px"
        className="object-contain"
        priority
      />
      <Image
        src="/farola_blanca_on.png"
        alt="Farola encendida"
        fill
        sizes="128px"
        className="object-contain animate-light-blink"
        priority
      />
    </div>
  );
}
