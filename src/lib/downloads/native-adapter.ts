// Capacitor-aware playback URL helper. When running inside the native shell,
// completed downloads are still in IndexedDB (engine is shared). If you later
// switch to Filesystem-backed storage on native, plug it in here.
type CapacitorGlobal = { isNativePlatform?: () => boolean; convertFileSrc?: (p: string) => string };

export function isNative(): boolean {
  const cap = (globalThis as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
  return !!cap?.isNativePlatform?.();
}

export function nativeFileUrl(path: string): string {
  const cap = (globalThis as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
  return cap?.convertFileSrc?.(path) ?? path;
}
