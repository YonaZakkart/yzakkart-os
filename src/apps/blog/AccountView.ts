import { el } from '../../os/dom';
import { api } from '../../services/api';
import { sesion } from '../../services/session';
import { crearInsignias } from './Insignias';
import type { ContextoBlog } from './contexto';

const REPO = 'https://github.com/YonaZakkart/yzakkart-os';

/** Registro con verificación falsa, insignias, inicio de sesión y cierre. */
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
      this.panel.replaceChildren(this.perfil(usuario.username), this.bloqueInsignias());
      return;
    }

    this.panel.replaceChildren(
      el('p', {
        clase: 'cuenta__intro',
        texto: `Estás navegando como ${usuario?.username ?? 'invitado'}. Puedes publicar, comentar y reaccionar así; si creas una cuenta, conservas todo lo que ya hiciste y puedes obtener insignias.`,
      }),
      this.formularioRegistro(),
      el('div', { clase: 'cuenta__sep', texto: 'o' }),
      this.formularioLogin(),
    );
  }

  /** Mensaje de éxito con un solo botón; al aceptar se vuelve al blog. */
  private mostrarExito(mensaje: string, alAceptar: () => void): void {
    const dialogo = el('dialog', { clase: 'dialogo dialogo--exito' });
    const aceptar = el('button', {
      clase: 'btn btn--primary',
      attrs: { type: 'button' },
      texto: 'Aceptar',
    });

    aceptar.addEventListener('click', () => {
      dialogo.close();
      dialogo.remove();
      alAceptar();
    });

    dialogo.append(
      el('h3', { clase: 'dialogo__title', texto: mensaje }),
      el('div', { clase: 'dialogo__acciones' }, aceptar),
    );

    this.raiz.append(dialogo);
    dialogo.showModal();
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
        el('p', { clase: 'perfil__nota', texto: 'Tus publicaciones están a tu nombre.' }),
      ),
      salir,
    );
  }

  /* ---------- Insignias ---------- */

  private bloqueInsignias(): HTMLElement {
    const usuario = this.ctx.usuario();
    const estado = el('div', { clase: 'insignias__estado' });

    const pintarEstado = (): void => {
      const actual = this.ctx.usuario();
      const marcas = crearInsignias({
        badge_gold: actual?.badge_gold === 1,
        badge_yz: actual?.badge_yz === 1,
      });
      estado.replaceChildren(
        marcas ?? el('span', { clase: 'insignias__ninguna', texto: 'Todavía sin insignias.' }),
      );
    };
    pintarEstado();

    const entradaToken = el('input', {
      clase: 'campo__input',
      attrs: {
        type: 'text',
        placeholder: 'token del equipo',
        'aria-label': 'Token de verificación',
      },
    });
    const canjear = el('button', {
      clase: 'btn btn--ghost',
      attrs: { type: 'button' },
      texto: 'Canjear',
    });
    const aviso = el('p', { clase: 'aviso', attrs: { 'aria-live': 'polite' } });

    canjear.addEventListener('click', async () => {
      canjear.disabled = true;
      aviso.textContent = '';
      try {
        const { user } = await api.insignia('token', entradaToken.value.trim());
        sesion.actualizarUsuario(user);
        entradaToken.value = '';
        pintarEstado();
        this.ctx.actualizarEncabezado();
        this.mostrarExito('El equipo de YZakkart agradece tu apoyo', () => this.ctx.alFeed());
      } catch (error) {
        aviso.textContent = error instanceof Error ? error.message : 'No se pudo canjear.';
      } finally {
        canjear.disabled = false;
      }
    });

    const obtener = el('button', {
      clase: 'btn btn--primary',
      attrs: { type: 'button' },
      texto: 'Obtener insignia',
    });

    const dialogo = el('dialog', { clase: 'dialogo' });
    dialogo.append(
      el('h3', { clase: 'dialogo__title', texto: 'Obtén tu insignia' }),
      el('p', {
        clase: 'dialogo__text',
        texto:
          'Pon una estrella en el repositorio oficial de YZakkart-OS para obtener tu insignia.',
      }),
      el(
        'div',
        { clase: 'dialogo__acciones' },
        el('button', { clase: 'btn btn--ghost', attrs: { type: 'button' }, texto: 'Ahora no' }),
        el('a', {
          clase: 'btn btn--primary',
          attrs: { href: REPO, target: '_blank', rel: 'noopener noreferrer' },
          texto: 'Ir al repositorio',
        }),
      ),
    );

    const [cerrar] = Array.from(dialogo.querySelectorAll<HTMLButtonElement>('.btn--ghost'));
    cerrar?.addEventListener('click', () => dialogo.close());

    const enlace = dialogo.querySelector<HTMLAnchorElement>('a');
    enlace?.addEventListener('click', async () => {
      try {
        const { user } = await api.insignia('estrella');
        sesion.actualizarUsuario(user);
        pintarEstado();
        this.ctx.actualizarEncabezado();
        dialogo.close();
        dialogo.remove();
        this.mostrarExito('El equipo de YZakkart agradece tu apoyo', () => this.ctx.alFeed());
      } catch {
        aviso.textContent = 'No se pudo guardar la insignia. Intenta de nuevo.';
      }
    });

    obtener.addEventListener('click', () => dialogo.showModal());

    if (!usuario) return el('div');

    return el(
      'section',
      { clase: 'cuenta__bloque insignias' },
      el('h3', { clase: 'cuenta__sub', texto: 'Insignias' }),
      el('p', {
        clase: 'cuenta__intro',
        texto: 'Tu cuenta puede llevar la insignia dorada y la del equipo de YZakkartOS.',
      }),
      estado,
      el('div', { clase: 'insignias__opciones' }, entradaToken, canjear),
      aviso,
      el('div', { clase: 'insignias__pie' }, obtener),
      dialogo,
    );
  }

  /* ---------- Registro ---------- */

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

  private verificacion(codigoInicial: string, correo: string): HTMLElement {
    const mensaje = el('p', { clase: 'cuenta__mensaje' });
    const pintarCodigo = (codigo: string): void => {
      mensaje.replaceChildren(
        document.createTextNode('Hemos enviado el código '),
        el('span', { clase: 'cuenta__codigo-en-linea', texto: codigo }),
        document.createTextNode(` a tu correo ${correo}`),
      );
    };
    pintarCodigo(codigoInicial);

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
    const verificar = el('button', {
      clase: 'btn btn--primary',
      attrs: { type: 'button' },
      texto: 'Verificar',
    });

    verificar.addEventListener('click', async () => {
      verificar.disabled = true;
      aviso.textContent = '';
      try {
        const sesionNueva = await api.verificar(entrada.value.trim());
        sesion.adoptar(sesionNueva.token, sesionNueva.user);
        this.ctx.actualizarEncabezado();
        this.mostrarExito('Cuenta creada con éxito', () => this.ctx.alFeed());
      } catch (error) {
        aviso.textContent = error instanceof Error ? error.message : 'No se pudo verificar.';
        verificar.disabled = false;
      }
    });

    const nota = el('p', { clase: 'cuenta__nota', attrs: { hidden: 'true' } });
    nota.textContent =
      'Si no has recibido ningún correo es porque ya no tenemos servicio de la prueba gratuita.';

    const reenviar = el('button', {
      clase: 'enlace',
      attrs: { type: 'button' },
      texto: 'Reenviar',
    });
    reenviar.addEventListener('click', async () => {
      reenviar.disabled = true;
      aviso.textContent = '';
      try {
        const { code } = await api.reenviar();
        pintarCodigo(code);
        nota.hidden = false;
        entrada.value = '';
        entrada.focus();
      } catch (error) {
        aviso.textContent = error instanceof Error ? error.message : 'No se pudo reenviar.';
      } finally {
        reenviar.disabled = false;
      }
    });

    return el(
      'section',
      { clase: 'cuenta__bloque cuenta__bloque--codigo' },
      el('h3', { clase: 'cuenta__sub', texto: 'Verifica tu correo' }),
      mensaje,
      el('p', {
        clase: 'cuenta__mensaje',
        texto: 'Por favor ingresa el código para verificar tu cuenta',
      }),
      entrada,
      aviso,
      verificar,
      el(
        'p',
        { clase: 'cuenta__reenvio' },
        document.createTextNode('¿No recibiste el código? '),
        reenviar,
      ),
      nota,
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
