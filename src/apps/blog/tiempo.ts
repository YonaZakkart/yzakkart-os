/** Fechas de SQLite: "YYYY-MM-DD HH:MM:SS" en UTC. */
export function aFecha(texto: string): Date {
  return new Date(texto.includes('T') ? texto : `${texto.replace(' ', 'T')}Z`);
}

export function fechaRelativa(texto: string): string {
  const fecha = aFecha(texto);
  const diferencia = Date.now() - fecha.getTime();
  const minutos = Math.floor(diferencia / 60_000);

  if (minutos < 1) return 'ahora mismo';
  if (minutos < 60) return `hace ${minutos} min`;

  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;

  const dias = Math.floor(horas / 24);
  if (dias < 7) return `hace ${dias} d`;

  return fecha.toLocaleDateString('es', { day: 'numeric', month: 'short' });
}

export function fechaLarga(texto: string): string {
  return aFecha(texto).toLocaleString('es', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
