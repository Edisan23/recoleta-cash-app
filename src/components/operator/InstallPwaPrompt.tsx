'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowDownToLine, Share } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

// Define the event type for beforeinstallprompt
interface BeforeInstallPromptEvent extends Event {
    readonly platforms: Array<string>;
    readonly userChoice: Promise<{
        outcome: 'accepted' | 'dismissed',
        platform: string
    }>;
    prompt(): Promise<void>;
}

export function InstallPwaPrompt() {
    const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        // This ensures we're on the client side, where window is available.
        setIsClient(true);

        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault(); // Prevent the default browser install prompt
            setInstallPromptEvent(e as BeforeInstallPromptEvent);
        };
        
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
             window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!installPromptEvent) return;
        
        // This will show the native installation prompt.
        installPromptEvent.prompt();
        
        // Wait for the user to respond to the prompt.
        const { outcome } = await installPromptEvent.userChoice;
        
        // We can optionally log the outcome.
        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
        } else {
            console.log('User dismissed the install prompt');
        }
        
        // The prompt can only be used once. Clear it.
        setInstallPromptEvent(null);
    };

    // --- RENDER LOGIC ---

    // Don't render anything on the server.
    if (!isClient) {
        return null;
    }

    // Don't render if the app is already installed (in standalone mode).
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) {
        return null;
    }

    // Don't render on non-mobile devices.
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isMobile = /iphone|ipad|ipod|android/.test(userAgent);
    if (!isMobile) {
        return null;
    }

    // If install prompt is available (Android), show the direct install button.
    if (installPromptEvent) {
        return (
             <Button
                onClick={handleInstallClick}
                className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-2xl animate-in slide-in-from-bottom-10 fade-in-50 duration-500"
                size="icon"
                title="Instalar Aplicación"
            >
                <ArrowDownToLine className="h-6 w-6" />
                <span className="sr-only">Instalar Aplicación</span>
            </Button>
        );
    }

    // If on mobile but no prompt (likely iOS), show the instructions popover.
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-2xl animate-in slide-in-from-bottom-10 fade-in-50 duration-500"
                    size="icon"
                    title="Instalar Aplicación"
                >
                    <ArrowDownToLine className="h-6 w-6" />
                    <span className="sr-only">Instalar Aplicación</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 mr-4 mb-2">
                <div className="grid gap-4">
                    <div className="space-y-2">
                        <h4 className="font-medium leading-none">Instalar Aplicación</h4>
                        <p className="text-sm text-muted-foreground">
                            Para instalar, toca el icono de <Share className="inline h-4 w-4 mx-1" />
                            y luego{' '}
                            <strong className="font-semibold">&apos;Añadir a la pantalla de inicio&apos;</strong>.
                        </p>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
