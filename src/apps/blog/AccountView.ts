import { el } from '../../os/dom';
import { api } from '../../services/api';
import { sesion } from '../../services/session';
import type { ContextoBlog } from './contexto';

/** Registro con verificación falsa, inicio de sesión y cierre de sesión. */
export class AccountView {
  readonly raiz: HTMLElement;
  private panel: HTMLElement;

  constructor(private ctx: ContextoBlog) {
    this.panel = el('div', { clase: 'cuenta__panel' });
    this.raiz = el(
      'div',
      { clase: 'cuenta' },
      el('h2', { clase: 'cuenta__title', texto: 'Tu cuenta' }),
      this.panel,
    );
  }

  montar(): void {
    this.pintar();
  }

  desmontar(): void {
    this.panel.replaceChildren();
  }

  private pintar(): void {
    const usuario = this.ctx.usuario();

    if (usuario && usuario.is_guest === 0) {
      this.panel.replaceChildren(this.perfil(usuario.username));
      return;
    }

    this.panel.replaceChildren(
      el('p', {
        clase: 'cuenta__intro',
        texto: `Estás navegando como ${usuario?.username ?? 'invitado'}. Puedes publicar, comentar y reaccionar así; si creas una cuenta, conservas todo lo que ya hiciste.`,
      }),
      this.formularioRegistro(),
      el('div', { clase: 'cuenta__sep', texto: 'o' }),
      this.formularioLogin(),
    );
  }

  private perfil(nombre: string): HTMLElement {
    const salir = el('button', {
      clase: 'btn btn--danger',
      attrs: { type: 'button' },
      texto: 'Cerrar sesión',
    });
    salir.addEventListener('click', async () => {
      salir.disabled = true;
      try {
        await api.salir();
      } catch {
        /* aunque falle en el servidor, localmente se olvida */
      }
      sesion.olvidar();
      await sesion.asegurar().catch(() => null);
      this.ctx.actualizarEncabezado();
      this.pintar();
    });

    return el(
      'div',
      { clase: 'perfil' },
      el('span', { clase: 'avatar avatar--grande', texto: nombre.slice(0, 1).toUpperCase() }),
      el(
        'div',
        {},
        el('p', { clase: 'perfil__nombre', texto: nombre }),
        el('p', {
          clase: 'perfil__nota',
          texto: 'Cuenta verificada. Tus publicaciones están a tu nombre.',
        }),
      ),
      salir,
    );
  }

  private formularioRegistro(): HTMLElement {
    const usuario = el('input', {
      clase: 'campo__input',
      attrs: {
        type: 'text',
        placeholder: 'usuario',
        maxlength: '20',
        'aria-label': 'Usuario',
        autocomplete: 'username',
      },
    });
    const clave = el('input', {
      clase: 'campo__input',
      attrs: {
        type: 'password',
        placeholder: 'contraseña',
        maxlength: '72',
        'aria-label': 'Contraseña',
        autocomplete: 'new-password',
      },
    });
    const correo = el('input', {
      clase: 'campo__input',
      attrs: {
        type: 'email',
        placeholder: 'correo@ejemplo.com',
        'aria-label': 'Correo',
        autocomplete: 'email',
      },
    });
    const aviso = el('p', { clase: 'aviso', attrs: { 'aria-live': 'polite' } });
    const enviar = el('button', {
      clase: 'btn btn--primary',
      attrs: { type: 'button' },
      texto: 'Crear cuenta',
    });

    enviar.addEventListener('click', async () => {
      enviar.disabled = true;
      aviso.textContent = '';
      try {
        const respuesta = await api.registro(
          usuario.value.trim(),
          clave.value,
          correo.value.trim(),
        );
        this.panel.replaceChildren(this.verificacion(respuesta.code, respuesta.email));
      } catch (error) {
        aviso.textContent = error instanceof Error ? error.message : 'No se pudo registrar.';
        enviar.disabled = false;
      }
    });

    return el(
      'section',
      { clase: 'cuenta__bloque' },
      el('h3', { clase: 'cuenta__sub', texto: 'Crear cuenta' }),
      usuario,
      clave,
      correo,
      aviso,
      enviar,
    );
  }

  private verificacion(codigo: string, correo: string): HTMLElement {
    const entrada = el('input', {
      clase: 'campo__input campo__input--codigo',
      attrs: {
        type: 'text',
        inputmode: 'numeric',
        maxlength: '6',
        placeholder: '000000',
        'aria-label': 'Código de verificación',
        autocomplete: 'one-time-code',
      },
    });
    const aviso = el('p', { clase: 'aviso', attrs: { 'aria-live': 'polite' } });
    const enviar = el('button', {
      clase: 'btn btn--primary',
      attrs: { type: 'button' },
      texto: 'Verificar',
    });

    enviar.addEventListener('click', async () => {
      enviar.disabled = true;
      aviso.textContent = '';
      try {
        const sesionNueva = await api.verificar(entrada.value.trim());
        sesion.adoptar(sesionNueva.token, sesionNueva.user);
        this.ctx.actualizarEncabezado();
        this.pintar();
      } catch (error) {
        aviso.textContent = error instanceof Error ? error.message : 'No se pudo verificar.';
        enviar.disabled = false;
      }
    });

    return el(
      'section',
      { clase: 'cuenta__bloque cuenta__bloque--codigo' },
      el('h3', { clase: 'cuenta__sub', texto: 'Verifica tu correo' }),
      el('p', {
        clase: 'cuenta__mensaje',
        texto: `Hemos enviado el código de verificación al correo ${correo}. Por favor ingrese el código.`,
      }),
      el('p', { clase: 'cuenta__codigo', texto: codigo }),
      el('p', {
        clase: 'cuenta__nota',
        texto: 'Código de demostración: este proyecto no envía correos reales.',
      }),
      entrada,
      aviso,
      enviar,
    );
  }

  private formularioLogin(): HTMLElement {
    const usuario = el('input', {
      clase: 'campo__input',
      attrs: {
        type: 'text',
        placeholder: 'usuario',
        'aria-label': 'Usuario para iniciar sesión',
        autocomplete: 'username',
      },
    });
    const clave = el('input', {
      clase: 'campo__input',
      attrs: {
        type: 'password',
        placeholder: 'contraseña',
        'aria-label': 'Contraseña para iniciar sesión',
        autocomplete: 'current-password',
      },
    });
    const aviso = el('p', { clase: 'aviso', attrs: { 'aria-live': 'polite' } });
    const enviar = el('button', {
      clase: 'btn btn--ghost',
      attrs: { type: 'button' },
      texto: 'Iniciar sesión',
    });

    enviar.addEventListener('click', async () => {
      enviar.disabled = true;
      aviso.textContent = '';
      try {
        const sesionNueva = await api.login(usuario.value.trim(), clave.value);
        sesion.adoptar(sesionNueva.token, sesionNueva.user);
        this.ctx.actualizarEncabezado();
        this.pintar();
      } catch (error) {
        aviso.textContent = error instanceof Error ? error.message : 'No se pudo iniciar sesión.';
        enviar.disabled = false;
      }
    });

    return el(
      'section',
      { clase: 'cuenta__bloque' },
      el('h3', { clase: 'cuenta__sub', texto: 'Ya tengo cuenta' }),
      usuario,
      clave,
      aviso,
      enviar,
    );
  }
}
