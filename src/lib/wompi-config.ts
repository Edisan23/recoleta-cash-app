// src/lib/wompi-config.ts
'use server';

// IMPORTANTE: Estos valores deben ser configurados en tu archivo .env.local.
// Crea un archivo llamado .env.local en la raíz de tu proyecto y añade las siguientes líneas:
// WOMPI_PUBLIC_KEY=pub_...
// WOMPI_PRIVATE_KEY=prv_...
// WOMPI_EVENTS_SECRET=prod_events_...
// NEXT_PUBLIC_APP_URL=http://localhost:3000

export const WOMPI_PUBLIC_KEY = process.env.WOMPI_PUBLIC_KEY!;
export const WOMPI_PRIVATE_KEY = process.env.WOMPI_PRIVATE_KEY!;
export const WOMPI_EVENTS_SECRET = process.env.WOMPI_EVENTS_SECRET!;
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

if (!WOMPI_PUBLIC_KEY || !WOMPI_PRIVATE_KEY || !APP_URL) {
    // No lanzamos error por WOMPI_EVENTS_SECRET ya que no se usa en este flujo.
    console.warn("Una o más variables de entorno de Wompi no están configuradas. Revisa tu archivo .env.local.");
}
