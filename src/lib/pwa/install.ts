/** Install to home screen: Android/desktop get a button, iPhone gets instructions. */
import { writable } from 'svelte/store';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const installPrompt = writable<BeforeInstallPromptEvent | null>(null);

export function isStandalone(): boolean {
  return matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
}

export function isIos(): boolean {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
}

export function listenForInstall(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    installPrompt.set(e as BeforeInstallPromptEvent);
  });
  window.addEventListener('appinstalled', () => installPrompt.set(null));
}
