import type { Estadisticas } from '../../models/types';
import type { Fondo } from '../../os/wallpapers';

export interface ContextoTerminal {
  escribir(texto: string, clase?: string): void;
  escribirLinea(texto?: string, clase?: string): void;
  limpiar(): void;
  usuario(): string;
  abrirBlog(): void;
  apagar(): void;
  fondos(): Fondo[];
  cambiarFondo(id: string): boolean;
  estadisticas(): Promise<Estadisticas>;
  esperar(ms: number): Promise<void>;
  glitch(duracion: number): Promise<void>;
  detenerAnimacion(): void;
}

export interface ComandoDef {
  uso: string;
  descripcion: string;
  oculto?: boolean;
  ejecutar(args: string, ctx: ContextoTerminal): Promise<void> | void;
}

const LOGO = [
  '      ▄▄▄▄▄▄▄',
  '    ▄█████████▄',
  '   ███▀     ▀███',
  '  ███   ▄▄▄   ███',
  '  ███   ███   ███',
  '   ███▄     ▄███',
  '    ▀█████████▀',
  '      ▀▀▀▀▀▀▀',
];

const VACA = [
  '        \\   ^__^',
  '         \\  (oo)\\_______',
  '            (__)\\       )\\/\\',
  '                ||----w |',
  '                ||     ||',
];

function anchoMaximo(lineas: string[]): number {
  return lineas.reduce((maximo, linea) => Math.max(maximo, linea.length), 0);
}

function envolver(texto: string, ancho: number): string[] {
  const palabras = texto.split(/\s+/);
  const lineas: string[] = [];
  let actual = '';

  for (const palabra of palabras) {
    if ((actual + palabra).length > ancho) {
      if (actual) lineas.push(actual.trimEnd());
      actual = `${palabra} `;
    } else {
      actual += `${palabra} `;
    }
  }
  if (actual.trim()) lineas.push(actual.trimEnd());
  return lineas.length > 0 ? lineas : [''];
}

export const COMANDOS: Record<string, ComandoDef> = {
  help: {
    uso: 'help',
    descripcion: 'Lista los comandos disponibles',
    ejecutar: (_args, ctx) => {
      const visibles = Object.values(COMANDOS).filter((c) => !c.oculto);
      const ancho = Math.max(...visibles.map((c) => c.uso.length)) + 2;

      ctx.escribirLinea('Comandos disponibles:', 'term__tenue');
      for (const comando of visibles) {
        ctx.escribirLinea(`  ${comando.uso.padEnd(ancho)}${comando.descripcion}`);
      }
      ctx.escribirLinea('');
      ctx.escribirLinea('Consejo: hay más de lo que parece.', 'term__tenue');
    },
  },

  clear: {
    uso: 'clear',
    descripcion: 'Limpia la pantalla',
    ejecutar: (_args, ctx) => ctx.limpiar(),
  },

  echo: {
    uso: 'echo <texto>',
    descripcion: 'Repite el texto',
    ejecutar: (args, ctx) => {
      if (!args) {
        ctx.escribirLinea('uso: echo <texto>', 'term__error');
        return;
      }
      ctx.escribirLinea(args);
    },
  },

  date: {
    uso: 'date',
    descripcion: 'Muestra la fecha y la hora',
    ejecutar: (_args, ctx) => {
      const ahora = new Date();
      const fecha = ahora.toLocaleDateString('es', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      const hora = ahora.toLocaleTimeString('es', { hour12: false });
      ctx.escribirLinea(`${fecha} ${hora}`);
    },
  },

  whoami: {
    uso: 'whoami',
    descripcion: 'Muestra el usuario actual',
    ejecutar: (_args, ctx) => {
      ctx.escribirLinea(ctx.usuario());
    },
  },

  ls: {
    uso: 'ls',
    descripcion: 'Lista los archivos del sistema',
    ejecutar: (_args, ctx) => {
      ctx.escribirLinea('Documentos  Descargas  Fotos  Musica  Videos  Sistema  readme.txt');
    },
  },

  cat: {
    uso: 'cat <archivo>',
    descripcion: 'Lee un archivo del sistema',
    oculto: true,
    ejecutar: (args, ctx) => {
      if (args !== 'readme.txt') {
        ctx.escribirLinea(`cat: ${args || 'falta el archivo'}: no existe`, 'term__error');
        return;
      }
      ctx.escribirLinea('readme.txt — léeme antes de quejarte del menú de inicio.');
      ctx.escribirLinea('');
      ctx.escribirLinea('Este sistema es una broma. El blog, en cambio, es real.');
      ctx.escribirLinea('Abre el Navegador y compruébalo.');
    },
  },

  neofetch: {
    uso: 'neofetch',
    descripcion: 'Muestra los datos del sistema',
    ejecutar: (_args, ctx) => {
      const datos = [
        `${ctx.usuario()}@yzakkart`,
        '------------------',
        'SO: YZakkartOS 1.0',
        'Núcleo: web-1.0',
        'Uptime: unos minutos',
        `Resolución: ${window.innerWidth}x${window.innerHeight}`,
        'Memoria: 512 MB (ficticios)',
      ];

      for (let i = 0; i < Math.max(LOGO.length, datos.length); i++) {
        const izquierda = (LOGO[i] ?? '').padEnd(22);
        const derecha = datos[i] ?? '';
        ctx.escribirLinea(`${izquierda}${derecha}`);
      }
    },
  },

  wallpaper: {
    uso: 'wallpaper <nombre>',
    descripcion: 'Cambia el fondo de pantalla',
    ejecutar: (args, ctx) => {
      const fondos = ctx.fondos();

      if (!args) {
        ctx.escribirLinea('Fondos disponibles:', 'term__tenue');
        for (const fondo of fondos) {
          ctx.escribirLinea(`  ${fondo.id.padEnd(12)}${fondo.nombre}`);
        }
        return;
      }

      if (ctx.cambiarFondo(args.toLowerCase())) {
        ctx.escribirLinea(`Fondo cambiado a "${args.toLowerCase()}".`);
      } else {
        ctx.escribirLinea(
          `wallpaper: "${args}" no existe. Usa "wallpaper" para ver la lista.`,
          'term__error',
        );
      }
    },
  },

  open: {
    uso: 'open blog',
    descripcion: 'Abre el navegador con YZakkart-Blog',
    ejecutar: (args, ctx) => {
      if (args !== 'blog') {
        ctx.escribirLinea(`open: no sé abrir "${args}". Prueba "open blog".`, 'term__error');
        return;
      }
      ctx.escribirLinea('Abriendo YZakkart-Blog…');
      ctx.abrirBlog();
    },
  },

  stats: {
    uso: 'stats',
    descripcion: 'Consulta la base y muestra los totales',
    ejecutar: async (_args, ctx) => {
      try {
        const datos = await ctx.estadisticas();
        ctx.escribirLinea('Base de datos YZakkart-Blog:', 'term__tenue');
        ctx.escribirLinea(`  publicaciones .... ${datos.posts}`);
        ctx.escribirLinea(`  comentarios ...... ${datos.comments}`);
        ctx.escribirLinea(`  reacciones ....... ${datos.reactions}`);
        ctx.escribirLinea(`  usuarios ......... ${datos.users}`);
      } catch {
        ctx.escribirLinea('stats: no se pudo consultar la base.', 'term__error');
      }
    },
  },

  cowsay: {
    uso: 'cowsay <texto>',
    descripcion: 'Una vaca dice lo que escribas',
    ejecutar: (args, ctx) => {
      if (!args) {
        ctx.escribirLinea('uso: cowsay <texto>', 'term__error');
        return;
      }

      const lineas = envolver(args, 34);
      const ancho = anchoMaximo(lineas);
      ctx.escribirLinea(` ${'_'.repeat(ancho + 2)}`);
      for (const linea of lineas) {
        ctx.escribirLinea(`< ${linea.padEnd(ancho)} >`);
      }
      ctx.escribirLinea(` ${'-'.repeat(ancho + 2)}`);
      for (const linea of VACA) ctx.escribirLinea(linea);
    },
  },

  matrix: {
    uso: 'matrix',
    descripcion: 'Lluvia de caracteres (3 segundos)',
    ejecutar: async (_args, ctx) => {
      const glifos = '01ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉ#$%&*';
      ctx.escribirLinea('Entrando a la matrix… (3 s)', 'term__tenue');

      for (let fila = 0; fila < 14; fila++) {
        let linea = '';
        for (let columna = 0; columna < 46; columna++) {
          linea += glifos[Math.floor(Math.random() * glifos.length)];
        }
        ctx.escribirLinea(linea, 'term__matrix');
        await ctx.esperar(120);
      }

      ctx.escribirLinea('Fin de la matrix. Nada era real.', 'term__tenue');
    },
  },

  shutdown: {
    uso: 'shutdown',
    descripcion: 'Apaga la computadora',
    ejecutar: async (args, ctx) => {
      if (args !== '-y' && args !== 'si' && args !== 'sí') {
        ctx.escribirLinea(
          'Se apagará la computadora. Escribe "shutdown -y" para confirmar.',
          'term__tenue',
        );
        return;
      }
      ctx.escribirLinea('Apagando YZakkartOS…');
      await ctx.esperar(600);
      ctx.apagar();
    },
  },

  sudo: {
    uso: 'sudo <comando>',
    descripcion: 'Ejecuta un comando como administrador',
    ejecutar: async (args, ctx) => {
      const comando = args.trim().toLowerCase();

      if (comando !== 'boost-fps') {
        ctx.escribirLinea('sudo: permiso denegado. Este sistema no confía en ti.', 'term__error');
        return;
      }

      /* La broma: nada de esto es real. */
      ctx.escribirLinea(`[sudo] contraseña para ${ctx.usuario()}: ********`, 'term__tenue');
      await ctx.esperar(500);
      ctx.escribirLinea('Optimizando el rendimiento del sistema…');
      await ctx.esperar(700);
      ctx.escribirLinea('[■■■■■■□□□□] 60%');
      await ctx.esperar(600);
      ctx.escribirLinea('Liberando memoria del núcleo…');
      await ctx.esperar(600);
      ctx.escribirLinea('Eliminando archivos temporales del sistema…');
      await ctx.esperar(400);
      ctx.escribirLinea('  /sistema/nucleo/init.yz');
      await ctx.esperar(300);
      ctx.escribirLinea('  /sistema/drivers/gpu/fps.ko');
      await ctx.esperar(300);
      ctx.escribirLinea('  /sistema/usuarios/invitado/recuerdos.dat');
      await ctx.esperar(600);
      ctx.escribirLinea('¡ERROR CRÍTICO! Se han eliminado archivos esenciales.', 'term__error');
      await ctx.esperar(500);
      ctx.escribirLinea('El sistema se apagará en 3… 2… 1…', 'term__error');
      await ctx.glitch(2400);
      ctx.apagar();
    },
  },
};
