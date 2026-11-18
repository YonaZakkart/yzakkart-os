export interface Comando {
  nombre: string;
  args: string;
}

/**
 * Parser de la terminal: comando + argumentos crudos.
 * Sin comillas, sin pipes, sin redirecciones: es una consola de juguete.
 */
export function parsear(linea: string): Comando | null {
  const limpia = linea.trim();
  if (!limpia) return null;

  const corte = limpia.indexOf(' ');
  if (corte === -1) {
    return { nombre: limpia.toLowerCase(), args: '' };
  }

  return {
    nombre: limpia.slice(0, corte).toLowerCase(),
    args: limpia.slice(corte + 1).trim(),
  };
}
