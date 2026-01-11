'use client';

import { useEffect } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/types/db-entities';

// Function to convert hex to HSL string: "H S% L%"
const hexToHslString = (hex: string): { hsl: string; hue: string } => {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  const hue = (h * 360).toFixed(0);
  const hsl = `${hue} ${(s * 100).toFixed(0)}% ${(l * 100).toFixed(0)}%`;
  return { hsl, hue };
};

// Function to apply the user's theme color
function applyThemeColor(color: string | null | undefined) {
  if (typeof window === 'undefined') return;
  const root = document.documentElement;
  
  const colorToApply = color || '#6d28d9'; // Fallback to default deep purple
  
  const { hsl, hue } = hexToHslString(colorToApply);
  root.style.setProperty('--user-primary-color', hsl);
  root.style.setProperty('--user-primary-hue', hue);
}

export function UserThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  useEffect(() => {
    // Apply theme based on user profile, or reset to default if logged out
    applyThemeColor(userProfile?.themeColor);
  }, [userProfile, user]); // Re-run when user profile changes or user logs in/out

  return <>{children}</>;
}
