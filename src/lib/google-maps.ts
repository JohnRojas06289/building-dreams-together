let loaderPromise: Promise<void> | null = null;

export function loadGoogleMaps(apiKey: string): Promise<void> {
  if (!apiKey) {
    return Promise.reject(new Error("Falta `VITE_GOOGLE_MAPS_API_KEY` para habilitar Google Maps."));
  }

  const googleWindow = window as Window & { google?: unknown };
  if (googleWindow.google) {
    return Promise.resolve();
  }

  if (loaderPromise) {
    return loaderPromise;
  }

  loaderPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=drawing,geometry&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("No se pudo cargar Google Maps JavaScript API."));
    document.head.appendChild(script);
  });

  return loaderPromise;
}
