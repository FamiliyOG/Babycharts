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
 * Generates an ultra-fast square or scaled thumbnail for profile avatars & milestone previews (BC-239)
 */
export function createThumbnail(fileOrDataUrl, size = 160, quality = 0.8) {
  if (typeof fileOrDataUrl === 'string' && fileOrDataUrl.startsWith('data:image/')) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error('Canvas context unavailable'));
          ctx.drawImage(img, 0, 0, size, size);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error('Fehler beim Rendern des Thumbnails.'));
      img.src = fileOrDataUrl;
    });
  }
  return compressImage(fileOrDataUrl, size, quality);
}
