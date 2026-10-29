// Capacitor-aware download helper. On the web it opens a download mirror in a
// new tab (browsers honor Content-Disposition); inside a Capacitor APK it
// fetches the binary and writes it directly to the device's Downloads folder
// using @capacitor/filesystem when present.

type CapacitorGlobal = { isNativePlatform?: () => boolean };

type FilesystemModule = {
  Filesystem: {
    writeFile: (opts: { path: string; data: string; directory: string; recursive?: boolean }) => Promise<unknown>;
  };
  Directory: { ExternalStorage: string };
};

export function startBrowserDownload(url: string, filename: string): void {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener noreferrer";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  window.setTimeout(() => a.remove(), 1000);
}

export async function downloadToDevice(url: string, filename: string): Promise<"native" | "web"> {
  const cap = (globalThis as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
  if (cap?.isNativePlatform?.()) {
    try {
      // Lazy import via a runtime-built specifier so Vite/TS don't try to
      // resolve the optional native module at build time.
      const mod = "@capacitor/filesystem";
      const fs = (await import(/* @vite-ignore */ mod).catch(() => null)) as FilesystemModule | null;
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
  startBrowserDownload(url, filename);
  return "web";
}