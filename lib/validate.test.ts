import { describe, expect, it } from 'vitest';
import {
  LIMITES,
  esReaccionValida,
  parsearListaIds,
  validarComentario,
  validarCuerpo,
  validarEmail,
  validarImagen,
  validarPassword,
  validarTitulo,
  validarUsuario,
} from './validate';

describe('validarUsuario', () => {
  it('acepta nombres válidos', () => {
    expect(validarUsuario('ana_92')).toBeNull();
    expect(validarUsuario('YonaZakkart')).toBeNull();
  });

  it('rechaza cortos, largos y caracteres raros', () => {
    expect(validarUsuario('ab')).not.toBeNull();
    expect(validarUsuario('a'.repeat(21))).not.toBeNull();
    expect(validarUsuario('ana 92')).not.toBeNull();
    expect(validarUsuario('ana@92')).not.toBeNull();
  });
});

describe('validarPassword', () => {
  it('exige longitud mínima y máxima', () => {
    expect(validarPassword('12345')).not.toBeNull();
    expect(validarPassword('123456')).toBeNull();
    expect(validarPassword('x'.repeat(73))).not.toBeNull();
  });
});

describe('validarEmail', () => {
  it('acepta formatos normales y rechaza el resto', () => {
    expect(validarEmail('ana@ejemplo.com')).toBeNull();
    expect(validarEmail('ana@ejemplo')).not.toBeNull();
    expect(validarEmail('ana ejemplo.com')).not.toBeNull();
    expect(validarEmail('')).not.toBeNull();
  });
});

describe('validarTitulo y validarCuerpo', () => {
  it('respeta los límites', () => {
    expect(validarTitulo('ab')).not.toBeNull();
    expect(validarTitulo('abc')).toBeNull();
    expect(validarTitulo('x'.repeat(LIMITES.tituloMax + 1))).not.toBeNull();
    expect(validarCuerpo('   ')).not.toBeNull();
    expect(validarCuerpo('hola')).toBeNull();
    expect(validarCuerpo('x'.repeat(LIMITES.cuerpoMax + 1))).not.toBeNull();
  });
});

describe('validarComentario', () => {
  it('no permite vacío ni exceso', () => {
    expect(validarComentario('')).not.toBeNull();
    expect(validarComentario('buen post')).toBeNull();
    expect(validarComentario('x'.repeat(LIMITES.comentarioMax + 1))).not.toBeNull();
  });
});

describe('validarImagen', () => {
  const pngMinimo = `data:image/png;base64,${Buffer.from('hola').toString('base64')}`;

  it('acepta una imagen pequeña válida', () => {
    const resultado = validarImagen(pngMinimo);
    expect(typeof resultado).toBe('object');
  });

  it('rechaza formatos no soportados', () => {
    expect(typeof validarImagen('data:image/gif;base64,AAAA')).toBe('string');
    expect(typeof validarImagen('https://ejemplo.com/a.png')).toBe('string');
  });

  it('rechaza imágenes que superan el límite', () => {
    const grande = `data:image/png;base64,${'A'.repeat(LIMITES.imagenBytes * 2)}`;
    expect(typeof validarImagen(grande)).toBe('string');
  });
});

describe('esReaccionValida', () => {
  it('solo acepta el conjunto aprobado', () => {
    expect(esReaccionValida('me_gusta')).toBe(true);
    expect(esReaccionValida('enojo')).toBe(true);
    expect(esReaccionValida('llorar')).toBe(false);
    expect(esReaccionValida('')).toBe(false);
  });
});

describe('parsearListaIds', () => {
  it('limpia, deduplica y descarta basura', () => {
    expect(parsearListaIds('1,2,2,3')).toEqual([1, 2, 3]);
    expect(parsearListaIds('1,abc,-4,0')).toEqual([1]);
    expect(parsearListaIds('')).toEqual([]);
    expect(parsearListaIds(undefined)).toEqual([]);
  });
});
