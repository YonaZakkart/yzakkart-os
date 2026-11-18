import type { Publicacion } from '../../models/types';
import { el, icono } from '../../os/dom';
import { api, urlImagen } from '../../services/api';
import { comprimirImagen, pesoLegible } from '../../services/imageCompressor';
import type { ContextoBlog } from './contexto';

/** Crear o editar una publicación, con imagen comprimida en el navegador. */
export class PostEditorView {
  readonly raiz: HTMLElement;
  private titulo: HTMLInputElement;
  private cuerpo: HTMLTextAreaElement;
  private archivo: HTMLInputElement;
  private vistaPrevia: HTMLElement;
  private aviso: HTMLElement;
  private guardar: HTMLButtonElement;
  private imagen: string | null;
  private enviando = false;

  constructor(
    private ctx: ContextoBlog,
    private publicacion?: Publicacion,
  ) {
    this.imagen = null;

    this.titulo = el('input', {
      clase: 'campo__input',
      attrs: {
        type: 'text',
        placeholder: 'Título de la publicación',
        maxlength: '120',
        'aria-label': 'Título',
        value: publicacion?.title ?? '',
      },
    });
    if (publicacion) this.titulo.value = publicacion.title;

    this.cuerpo = el('textarea', {
      clase: 'campo__area',
      attrs: {
        placeholder: '¿Qué quieres contar?',
        rows: '10',
        maxlength: '5000',
        'aria-label': 'Texto de la publicación',
      },
    });
    if (publicacion) this.cuerpo.value = publicacion.body;

    this.archivo = el('input', {
      clase: 'visually-hidden',
      attrs: { type: 'file', accept: 'image/*', id: 'editor-imagen' },
    });

    this.vistaPrevia = el('div', { clase: 'editor__preview' });
    this.aviso = el('p', { clase: 'aviso', attrs: { 'aria-live': 'polite' } });

    this.guardar = el(
      'button',
      { clase: 'btn btn--primary', attrs: { type: 'button' } },
      icono('imagen', 16),
      el('span', { texto: publicacion ? 'Guardar cambios' : 'Publicar' }),
    );

    const cancelar = el('button', {
      clase: 'btn btn--ghost',
      attrs: { type: 'button' },
      texto: 'Cancelar',
    });
    cancelar.addEventListener('click', () =>
      publicacion ? this.ctx.alDetalle(publicacion.id) : this.ctx.alFeed(),
    );

    const elegir = el(
      'label',
      { clase: 'btn btn--ghost', attrs: { for: 'editor-imagen' } },
      icono('imagen', 16),
      el('span', { texto: 'Añadir imagen' }),
    );

    this.raiz = el(
      'div',
      { clase: 'editor' },
      el('h2', {
        clase: 'editor__title',
        texto: publicacion ? 'Editar publicación' : 'Nueva publicación',
      }),
      el(
        'div',
        { clase: 'campo' },
        el('label', { clase: 'campo__label', texto: 'Título' }),
        this.titulo,
      ),
      el(
        'div',
        { clase: 'campo' },
        el('label', { clase: 'campo__label', texto: 'Texto' }),
        this.cuerpo,
      ),
      el('div', { clase: 'editor__media' }, elegir, this.archivo),
      this.vistaPrevia,
      this.aviso,
      el('div', { clase: 'editor__acciones' }, cancelar, this.guardar),
    );

    if (publicacion?.hasImage) {
      this.imagen = null;
      this.vistaPrevia.append(
        el('img', {
          clase: 'editor__preview-img',
          attrs: { src: urlImagen(publicacion.id, 'full'), alt: 'Imagen actual' },
        }),
        this.botonQuitarImagen(),
      );
    }

    this.archivo.addEventListener('change', () => void this.procesarArchivo());
    this.guardar.addEventListener('click', () => void this.enviar());
  }

  montar(): void {
    this.titulo.focus();
  }

  desmontar(): void {
    this.raiz.remove();
  }

  private async procesarArchivo(): Promise<void> {
    const archivo = this.archivo.files?.[0];
    if (!archivo) return;

    this.aviso.textContent = 'Comprimiendo imagen…';
    const resultado = await comprimirImagen(archivo);

    if ('error' in resultado) {
      this.aviso.textContent = resultado.error;
      this.archivo.value = '';
      return;
    }

    this.imagen = resultado.dataUrl;
    this.vistaPrevia.replaceChildren(
      el('img', {
        clase: 'editor__preview-img',
        attrs: { src: resultado.dataUrl, alt: 'Vista previa' },
      }),
      el('span', { clase: 'editor__peso', texto: pesoLegible(resultado.bytes) }),
      this.botonQuitarImagen(),
    );
    this.aviso.textContent = '';
  }

  private botonQuitarImagen(): HTMLButtonElement {
    const quitar = el('button', {
      clase: 'btn btn--ghost btn--chico',
      attrs: { type: 'button' },
      texto: 'Quitar imagen',
    });
    quitar.addEventListener('click', () => {
      this.imagen = '';
      this.vistaPrevia.replaceChildren();
      this.archivo.value = '';
    });
    return quitar;
  }

  private async enviar(): Promise<void> {
    if (this.enviando) return;

    const titulo = this.titulo.value.trim();
    const cuerpo = this.cuerpo.value.trim();

    if (titulo.length < 3) {
      this.aviso.textContent = 'El título necesita al menos 3 caracteres.';
      this.titulo.focus();
      return;
    }
    if (!cuerpo) {
      this.aviso.textContent = 'El texto no puede estar vacío.';
      this.cuerpo.focus();
      return;
    }

    this.enviando = true;
    this.guardar.disabled = true;
    this.aviso.textContent = 'Guardando…';

    try {
      if (this.publicacion) {
        const cambios: { title: string; body: string; image?: string } = {
          title: titulo,
          body: cuerpo,
        };
        if (this.imagen !== null) cambios.image = this.imagen;
        await api.editarPost(this.publicacion.id, cambios);
        this.ctx.alDetalle(this.publicacion.id);
      } else {
        const { post } = await api.crearPost(titulo, cuerpo, this.imagen ?? undefined);
        this.ctx.alDetalle(post.id);
      }
    } catch (error) {
      this.aviso.textContent = error instanceof Error ? error.message : 'No se pudo guardar.';
      this.guardar.disabled = false;
    } finally {
      this.enviando = false;
    }
  }
}
