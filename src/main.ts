import { BootScreen } from './os/BootScreen';
import { DeskScene } from './os/DeskScene';
import { DeviceMode } from './os/DeviceMode';
import { OSShell } from './os/OSShell';
import { sesion } from './services/session';
import './styles/tokens.css';

const encontrado = document.querySelector<HTMLDivElement>('#app');
if (!encontrado) throw new Error('Falta #app en el documento.');
const raiz: HTMLDivElement = encontrado;

const dispositivo = new DeviceMode();
let pantalla: DeskScene | BootScreen | OSShell | null = null;

function limpiar(): void {
  pantalla?.desmontar();
  pantalla = null;
  raiz.replaceChildren();
}

function mostrarMesa(): void {
  limpiar();
  const escena = new DeskScene(raiz, () => mostrarArranque());
  pantalla = escena;
  escena.montar();
}

function mostrarArranque(): void {
  limpiar();
  const arranque = new BootScreen(raiz, () => mostrarEscritorio(), !dispositivo.esEscritorio);
  pantalla = arranque;
  arranque.montar();
}

function mostrarEscritorio(): void {
  limpiar();
  const shell = new OSShell(
    raiz,
    () => mostrarMesa(),
    () => sesion.nombre,
  );
  pantalla = shell;
  shell.montar();
}

/* El cambio de modo no recarga: se rehace la presentación conservando la sesión. */
dispositivo.alCambiarModo(() => {
  if (pantalla instanceof OSShell) mostrarEscritorio();
});

/* Se prepara la identidad en segundo plano para que el blog abra al instante. */
sesion.asegurar().catch(() => {
  /* sin red: el blog mostrará su propio error al abrirse */
});

try {
  mostrarMesa();
} catch (error) {
  raiz.replaceChildren(
    Object.assign(document.createElement('pre'), {
      textContent: `FALLO AL INICIAR:\n${(error as Error).message}\n${(error as Error).stack ?? ''}`,
      style:
        'padding:24px;color:#fff;background:#300;font:12px monospace;white-space:pre-wrap;height:100vh;margin:0',
    }),
  );
}
