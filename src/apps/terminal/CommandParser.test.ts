import { describe, expect, it } from 'vitest';
import { parsear } from './CommandParser';

describe('parsear', () => {
  it('separa comando y argumentos', () => {
    expect(parsear('echo hola mundo')).toEqual({ nombre: 'echo', args: 'hola mundo' });
    expect(parsear('open blog')).toEqual({ nombre: 'open', args: 'blog' });
  });

  it('normaliza el nombre a minúsculas y respeta los argumentos', () => {
    expect(parsear('  NEOFETCH  ')).toEqual({ nombre: 'neofetch', args: '' });
    expect(parsear('ECHO Hola Mundo')).toEqual({ nombre: 'echo', args: 'Hola Mundo' });
  });

  it('devuelve null en líneas vacías', () => {
    expect(parsear('')).toBeNull();
    expect(parsear('   ')).toBeNull();
  });

  it('mantiene el resto tal cual, incluidos espacios internos', () => {
    expect(parsear('cowsay  dos  espacios')).toEqual({ nombre: 'cowsay', args: 'dos  espacios' });
  });
});
