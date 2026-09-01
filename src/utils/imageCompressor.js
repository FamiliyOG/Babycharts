/**
 * src/utils/imageCompressor.js
 *
 * Client-side canvas image resizing and compression utility.
 * Reduces raw camera / gallery photos to lightweight JPEG data URLs (< 300 KB)
 * ensuring fast network transmission and smooth UI rendering.
 */

export function compressImage(file, maxDim = 1200, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error('Keine Datei übergeben.'));
    }

    if (!file.type?.startsWith('image/')) {
      return reject(
        new Error('Ungültiges Dateiformat: Bitte wählen Sie ein Bild aus (PNG, JPG, WebP).')
      );
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result !== 'string' || !result.startsWith('data:image/')) {
        return reject(new Error('Ungültiges Bildformat.'));
      }

      const img = new Image();
      img.onload = () => {
        try {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return reject(new Error('Canvas-Kontext konnte nicht erstellt werden.'));
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedDataUrl);
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = () => {
        reject(new Error('Fehler beim Laden des Bildes.'));
      };

      img.src = result;
    };

    reader.onerror = () => {
      reject(new Error('Fehler beim Einlesen der Datei.'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Reads any supported media file (image or video) and returns a Data URL.
 * Images are automatically compressed to max 1200px.
 * Videos (mp4/webm) are converted to Base64 Data URL directly up to 25MB (BC-212).
 */
export function readMediaAsDataUrl(file, maxImageDim = 1200, imageQuality = 0.82) {
  if (!file) return Promise.reject(new Error('Keine Datei übergeben.'));

  if (file.type?.startsWith('video/')) {
    if (file.size > 25 * 1024 * 1024) {
      return Promise.reject(new Error('Video zu groß. Maximal 25 MB erlaubt.'));
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result);
      reader.onerror = () => reject(new Error('Fehler beim Einlesen des Videos.'));
      reader.readAsDataURL(file);
    });
  }

  if (file.type?.startsWith('image/')) {
    return compressImage(file, maxImageDim, imageQuality);
  }

  return Promise.reject(new Error('Nicht unterstütztes Dateiformat (nur Fotos oder Videos).'));
}
