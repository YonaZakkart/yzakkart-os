import type { Usuario } from '../models/types';
import { api, guardarToken } from './api';

const CLAVE = 'yzakkart.session';

interface Guardada {
  token: string;
  user: Usuario;
}

let actual: Usuario | null = null;
let enCurso: Promise<Usuario> | null = null;

function leer(): Guardada | null {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (!crudo) return null;
    const datos = JSON.parse(crudo) as Guardada;
    return datos?.token && datos?.user ? datos : null;
  } catch {
    return null;
  }
}

function escribir(datos: Guardada): void {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(datos));
  } catch {
    /* modo privado: la sesión dura lo que dure la pestaña */
  }
}

function limpiar(): void {
  try {
    localStorage.removeItem(CLAVE);
  } catch {
    /* nada */
  }
}

export const sesion = {
  get usuario(): Usuario | null {
    return actual;
  },

  get nombre(): string {
    return actual?.username ?? 'invitado';
  },

  get esInvitado(): boolean {
    return actual?.is_guest !== 0;
  },

  /** Garantiza que exista una identidad: reutiliza, valida o crea invitado. */
  asegurar(): Promise<Usuario> {
    if (actual) return Promise.resolve(actual);
    if (enCurso) return enCurso;

    enCurso = (async () => {
      const guardada = leer();
      if (guardada) {
        guardarToken(guardada.token);
        try {
          const { user } = await api.me();
          actual = user;
          escribir({ token: guardada.token, user });
          return user;
        } catch {
          guardarToken(null);
          limpiar();
        }
      }

      const creada = await api.invitado();
      guardarToken(creada.token);
      actual = creada.user;
      escribir({ token: creada.token, user: creada.user });
      return creada.user;
    })().finally(() => {
      enCurso = null;
    });

    return enCurso;
  },

  /** Refresca el usuario en memoria y en el navegador (por ejemplo, tras una insignia). */
  actualizarUsuario(user: Usuario): void {
    actual = user;
    const guardada = leer();
    if (guardada) escribir({ token: guardada.token, user });
  },

  /** Guarda una sesión recién emitida (registro, verificación o login). */
  adoptar(token: string, user: Usuario): void {
    guardarToken(token);
    actual = user;
    escribir({ token, user });
  },

  olvidar(): void {
    guardarToken(null);
    actual = null;
    limpiar();
  },
};
