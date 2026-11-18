const LADO_MAXIMO = 1600;
const LIMITE_BYTES = 200 * 1024;
const CALIDADES = [0.82, 0.72, 0.6];

export interface ImagenComprimida {
  dataUrl: string;
  bytes: number;
}

export type ResultadoCompresion = ImagenComprimida | { error: string };

function pesoDeDataUrl(dataUrl: string): number {
  const base64 = dataUrl.split(',')[1] ?? '';
  return Math.floor((base64.length * 3) / 4);
}

/**
 * Comprime en el navegador antes de enviar: canvas, WebP y bajada de calidad.
 * La API valida otra vez; esto es la primera línea de defensa.
 */
export async function comprimirImagen(archivo: File): Promise<ResultadoCompresion> {
  if (!archivo.type.startsWith('image/')) {
    return { error: 'El archivo debe ser una imagen.' };
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(archivo);
  } catch {
    return { error: 'No se pudo leer la imagen. Prueba con otra.' };
  }

  const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height));
  const ancho = Math.max(1, Math.round(bitmap.width * escala));
  const alto = Math.max(1, Math.round(bitmap.height * escala));

  const lienzo = document.createElement('canvas');
  lienzo.width = ancho;
  lienzo.height = alto;
  const contexto = lienzo.getContext('2d');

  if (!contexto) {
    bitmap.close();
    return { error: 'El navegador no pudo procesar la imagen.' };
  }

  contexto.drawImage(bitmap, 0, 0, ancho, alto);
  bitmap.close();

  for (const calidad of CALIDADES) {
    const dataUrl = lienzo.toDataURL('image/webp', calidad);
    const bytes = pesoDeDataUrl(dataUrl);
    if (bytes <= LIMITE_BYTES) {
      return { dataUrl, bytes };
    }
  }

  return {
    error: `La imagen pesa demasiado incluso comprimida (límite ${Math.round(LIMITE_BYTES / 1024)} KB). Prueba con otra.`,
  };
}

export function pesoLegible(bytes: number): string {
  return bytes >= 1024 ? `${Math.round(bytes / 1024)} KB` : `${bytes} B`;
}
