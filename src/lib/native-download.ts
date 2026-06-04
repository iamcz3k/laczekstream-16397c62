// Capacitor-aware download helper. On the web it opens a download mirror in a
// new tab (browsers honor Content-Disposition); inside a Capacitor APK it
// fetches the binary and writes it directly to the device's Downloads folder
// using @capacitor/filesystem when present.

type CapacitorGlobal = { isNativePlatform?: () => boolean };

export async function downloadToDevice(url: string, filename: string): Promise<"native" | "web"> {
  const cap = (globalThis as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
  if (cap?.isNativePlatform?.()) {
    try {
      // Lazy import: only resolves inside the native shell, never bundled for web.
      const fs = await import(/* @vite-ignore */ "@capacitor/filesystem").catch(() => null) as
        | typeof import("@capacitor/filesystem")
        | null;
      if (fs?.Filesystem) {
        const res = await fetch(url);
        const buf = await res.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
        await fs.Filesystem.writeFile({
          path: `Download/${filename}`,
          data: base64,
          directory: fs.Directory.ExternalStorage,
          recursive: true,
        });
        return "native";
      }
    } catch {
      // fall through to web behavior
    }
  }
  window.open(url, "_blank", "noopener,noreferrer");
  return "web";
}