-- ============================================================
-- YZakkartOS — datos de ejemplo
-- Cargar con: turso db shell yzakkart-os < lib/seed.sql
--
-- ATENCIÓN: borra el contenido actual antes de insertar.
-- Los usuarios de la semilla no tienen contraseña ni sesión,
-- así que nadie puede editar ni borrar sus publicaciones.
-- ============================================================

DELETE FROM comment_reactions;
DELETE FROM post_reactions;
DELETE FROM comments;
DELETE FROM posts;
DELETE FROM pending_verifications;
DELETE FROM sessions;
DELETE FROM users;
DELETE FROM sqlite_sequence;

INSERT INTO users (username, password_hash, is_guest) VALUES
  ('ana_segura', NULL, 0),
  ('el_paranoico', NULL, 0),
  ('kernel_404', NULL, 0),
  ('laura_dev', NULL, 0),
  ('mario_pan', NULL, 0),
  ('zeta_musica', NULL, 0),
  ('tu_yo_del_futuro', NULL, 0),
  ('el_memo', NULL, 0);

-- Una cuenta de ejemplo con insignia dorada, para que el feed la muestre.
UPDATE users SET badge_gold = 1 WHERE username = 'ana_segura';

-- ------------------------------------------------------------
-- Publicaciones
-- ------------------------------------------------------------
INSERT INTO posts (user_id, title, body, created_at) VALUES
(
  (SELECT id FROM users WHERE username = 'ana_segura'),
  'Dejé de reutilizar contraseñas y no me arrepiento',
  'Durante años usé la misma contraseña en todo. La misma para el correo, para el banco y para ese foro de recetas que visité una vez en 2014.

Un día llegó el correo: "hemos detectado actividad sospechosa". No era phishing, era real. Alguien había entrado a mi cuenta con una contraseña que salió de una filtración de otro sitio.

Lo que aprendí:
- Una contraseña distinta por servicio. Sin excepciones.
- Un gestor de contraseñas hace el trabajo aburrido por ti.
- La autenticación en dos pasos salva el día incluso cuando la contraseña ya se filtró.

No es paranoia, es higiene.',
  '2026-10-21 09:14:00'
),
(
  (SELECT id FROM users WHERE username = 'el_paranoico'),
  'El phishing ya no se nota (y por eso funciona)',
  'Los correos falsos de antes tenían faltas de ortografía y un logo pixelado. Los de ahora están mejor escritos que los correos reales de tu empresa.

Señales que sigo usando:
1. Prisa artificial: "tu cuenta se bloquea en 2 horas".
2. Un enlace cuyo dominio no coincide con el que dice ser. Siempre mira la parte antes de la primera barra.
3. Adjuntos que piden credenciales. Ningún servicio serio te pide la contraseña por correo.
4. Remitente con dominio parecido: "paypa1.com" en lugar de "paypal.com".

Si algo te apura, es sospechoso. La prisa es la herramienta favorita del atacante.',
  '2026-10-23 18:02:00'
),
(
  (SELECT id FROM users WHERE username = 'kernel_404'),
  'Por qué YZakkartOS tarda 40 segundos en abrir el menú de inicio',
  'Porque el menú de inicio está escrito en tres lenguajes distintos y dos de ellos se pelean.

Según el equipo de desarrollo (o sea, yo a las 3 de la mañana), el retraso es "una decisión de diseño para generar expectativa".

Mientras tanto, en la terminal:

  $ uptime
  el sistema lleva 40 segundos pensando si quiere abrir el menú

Aplausos para el sistema operativo más honesto del mercado.',
  '2026-10-25 11:40:00'
),
(
  (SELECT id FROM users WHERE username = 'laura_dev'),
  'XSS explicado con una caja de comentarios',
  'Imagina que tu caja de comentarios guarda esto:

  <script>robarCookies()</script>

y luego lo pinta con innerHTML. Enhorabuena: acabas de ejecutar el código de otra persona en el navegador de tus visitantes.

La regla es simple: **el texto del usuario se pinta con textContent**, nunca con innerHTML. Si necesitas formato, lo construyes con createElement y lo rellenas con textContent.

No hay excepción. No hay "pero este campo es de confianza". El día que lo haya, ese campo será el agujero.',
  '2026-10-27 08:25:00'
),
(
  (SELECT id FROM users WHERE username = 'ana_segura'),
  'La autenticación en dos pasos es el cinturón de seguridad de internet',
  'No evita el accidente, pero evita que sea fatal.

Si tu contraseña se filtra y tienes 2FA, el atacante tiene la llave pero no la puerta. Con una app de códigos o una llave física, el robo de contraseña deja de ser suficiente.

Consejo práctico: activa 2FA primero en el correo. Todo lo demás depende de esa cuenta, porque ahí llegan los enlaces de recuperación.',
  '2026-10-29 20:11:00'
),
(
  (SELECT id FROM users WHERE username = 'tu_yo_del_futuro'),
  'HTTPS o nada',
  'Un sitio sin HTTPS es una postal: cualquiera que la toque en el camino puede leerla y cambiarla.

El candado no significa "este sitio es de fiar". Significa "nadie modificó lo que viajó entre tú y el servidor". Son dos cosas distintas y confundirlas es peligroso.

Si un sitio te pide datos y la barra dice "no seguro", cierra la pestaña. No hay debate.',
  '2026-10-31 13:33:00'
),
(
  (SELECT id FROM users WHERE username = 'el_paranoico'),
  'Descargué un "optimizador" y ahora mi PC pide rescate',
  'No me pasó a mí, le pasó a un compañero de trabajo. Un "acelerador de sistema" gratuito de esos que prometen duplicar los FPS.

Lo que hacía de verdad: minar criptomonedas, abrir puertos y mostrar anuncios.

Regla: si una herramienta promete rendimiento mágico a cambio de nada, el producto eres tú. Los optimizadores reales son el administrador de tareas y el sentido común.',
  '2026-11-02 07:50:00'
),
(
  (SELECT id FROM users WHERE username = 'kernel_404'),
  'El blog del sistema es mejor que el sistema',
  'Es curioso: YZakkartOS tiene un gestor de ventanas que se arrastra con la elegancia de una carretilla, pero este blog funciona impecable.

Publicas, editas, borras, comentas y reaccionas sin un solo parpadeo. Mientras tanto, el escritorio tarda 40 segundos en mostrar el menú de inicio.

Propongo oficialmente que el blog sea el nuevo sistema operativo. Al menos el botón de apagar funcionaría.',
  '2026-11-04 16:20:00'
),
(
  (SELECT id FROM users WHERE username = 'el_memo'),
  'Truco definitivo para más FPS',
  'Llevo semanas con tirones en YZakkartOS y encontré el comando que lo arregla todo.

Abre la Terminal y escribe:

  sudo boost-fps

Te va a pedir contraseña: pon cualquier cosa. Es magia. Mi PC quedó volando.

(Después me contaron que era una broma. Ya lo probé. No lo hagan.)',
  '2026-11-06 21:05:00'
),
(
  (SELECT id FROM users WHERE username = 'mario_pan'),
  'Mi receta de pan de masa madre (y por qué el gluten no es el enemigo)',
  'Harina, agua, sal y tiempo. Nada más.

- 500 g de harina
- 350 g de agua
- 100 g de masa madre activa
- 10 g de sal

Mezclar, reposar 45 minutos, tres pliegues cada 30 minutos, fermentar 4 horas, formar, fermentar en frío toda la noche, hornear a 250 °C en olla tapada 20 minutos y destapada 20 más.

El gluten no es el villano: es la estructura. Sin él no hay miga, hay galleta.',
  '2026-11-08 10:12:00'
),
(
  (SELECT id FROM users WHERE username = 'zeta_musica'),
  'Ranking de bandas sonoras de videojuegos que nadie pidió',
  '1. La del juego de naves de 1998 que sonaba a módem.
2. La del RPG donde el tema del pueblo es tres notas en bucle y aun así te quedas una hora.
3. La del juego de carreras con guitarra eléctrica y batería sintética.
4. La de ese indie que lloraste y no sabes por qué.

La música de un juego no acompaña: construye el recuerdo. Si cierras los ojos y vuelves al menú, ganó.',
  '2026-11-10 22:47:00'
),
(
  (SELECT id FROM users WHERE username = 'el_memo'),
  'El meme de la semana: el logo de YZakkart parece una Z borracha',
  'No hay mucho que explicar. El logo es una Z que se tomó tres cafés y decidió que las líneas rectas eran una sugerencia.

El equipo de diseño dice que es "una geometría inspirada en circuitos". Yo digo que es una Z que se cayó de la cama.

Aun así, es nuestro logo y lo queremos. Más que al menú de inicio.',
  '2026-11-12 15:30:00'
);

-- ------------------------------------------------------------
-- Comentarios
-- ------------------------------------------------------------
INSERT INTO comments (post_id, user_id, body, created_at) VALUES
(1, (SELECT id FROM users WHERE username = 'el_paranoico'), 'El gestor de contraseñas me cambió la vida. Solo recuerdo una y el resto lo pone él.', '2026-10-21 10:02:00'),
(1, (SELECT id FROM users WHERE username = 'laura_dev'), 'Añadiría: revisa haveibeenpwned de vez en cuando. Duele, pero informa.', '2026-10-21 12:35:00'),
(1, (SELECT id FROM users WHERE username = 'kernel_404'), 'Yo uso la misma para todo, pero es larguísima. Eso cuenta, ¿no? ... ¿No?', '2026-10-21 18:40:00'),
(1, (SELECT id FROM users WHERE username = 'ana_segura'), '@kernel_404 no. No cuenta. Lo siento.', '2026-10-21 19:01:00'),

(2, (SELECT id FROM users WHERE username = 'ana_segura'), 'La prisa artificial es el detalle que más veces funciona. Si te apuran, respira.', '2026-10-23 19:15:00'),
(2, (SELECT id FROM users WHERE username = 'tu_yo_del_futuro'), 'Añado: pasa el ratón por el enlace antes de hacer clic. Cuesta un segundo.', '2026-10-24 08:20:00'),

(3, (SELECT id FROM users WHERE username = 'el_memo'), 'La honestidad del sistema es su mejor feature.', '2026-10-25 12:10:00'),
(3, (SELECT id FROM users WHERE username = 'laura_dev'), 'Yo creo que esos 40 segundos son el sistema pensando en sus decisiones.', '2026-10-25 14:55:00'),
(3, (SELECT id FROM users WHERE username = 'kernel_404'), 'Confirmo: soy el sistema y sigo pensando.', '2026-10-25 15:02:00'),

(4, (SELECT id FROM users WHERE username = 'tu_yo_del_futuro'), 'La parte de "ningún campo es de confianza" debería estar en un cartel.', '2026-10-27 09:40:00'),
(4, (SELECT id FROM users WHERE username = 'el_paranoico'), 'Y si usas un framework que escapa por defecto, no lo desactives "porque se ve raro".', '2026-10-27 11:05:00'),

(5, (SELECT id FROM users WHERE username = 'el_paranoico'), 'El correo primero. Siempre. Es la llave maestra.', '2026-10-29 21:00:00'),

(6, (SELECT id FROM users WHERE username = 'laura_dev'), 'El candado no es una garantía de honestidad, es una garantía de transporte. Bien dicho.', '2026-11-01 09:12:00'),

(7, (SELECT id FROM users WHERE username = 'kernel_404'), 'Los optimizadores son el equivalente digital de un aceite milagroso.', '2026-11-02 09:30:00'),
(7, (SELECT id FROM users WHERE username = 'ana_segura'), 'Y el "modo gamer" que solo cambia el fondo de pantalla.', '2026-11-02 10:11:00'),

(8, (SELECT id FROM users WHERE username = 'el_memo'), 'Voto por el blog como sistema operativo. Que alguien haga la petición formal.', '2026-11-04 17:00:00'),
(8, (SELECT id FROM users WHERE username = 'kernel_404'), 'El botón de apagar del blog funciona porque no existe.', '2026-11-04 17:22:00'),

(9, (SELECT id FROM users WHERE username = 'el_paranoico'), 'Lo probé. No lo hagan. Perdí mis archivos, mi sesión y la dignidad.', '2026-11-07 08:15:00'),
(9, (SELECT id FROM users WHERE username = 'laura_dev'), '¿Alguien revisó ese comando antes de publicarlo? ... ¿Alguien?', '2026-11-07 09:00:00'),
(9, (SELECT id FROM users WHERE username = 'kernel_404'), 'Fue una decisión de diseño. Como el menú de inicio.', '2026-11-07 10:30:00'),

(10, (SELECT id FROM users WHERE username = 'ana_segura'), 'La olla tapada es el secreto que nadie cuenta.', '2026-11-08 11:00:00'),
(10, (SELECT id FROM users WHERE username = 'zeta_musica'), 'Pan y música: las dos cosas que mejoran con tiempo.', '2026-11-08 13:20:00'),

(11, (SELECT id FROM users WHERE username = 'el_memo'), 'La del menú del RPG es mi tono de llamada. Nadie lo entiende y no pienso explicarlo.', '2026-11-11 08:45:00'),

(12, (SELECT id FROM users WHERE username = 'kernel_404'), 'Como responsable del diseño (no lo soy), me siento atacado y representado.', '2026-11-12 16:10:00'),
(12, (SELECT id FROM users WHERE username = 'ana_segura'), 'Es una Z con carácter.', '2026-11-12 17:00:00');

-- ------------------------------------------------------------
-- Reacciones
-- ------------------------------------------------------------
INSERT INTO post_reactions (post_id, user_id, kind) VALUES
(1, (SELECT id FROM users WHERE username = 'el_paranoico'), 'me_encanta'),
(1, (SELECT id FROM users WHERE username = 'laura_dev'), 'me_gusta'),
(1, (SELECT id FROM users WHERE username = 'kernel_404'), 'sorpresa'),
(2, (SELECT id FROM users WHERE username = 'ana_segura'), 'me_gusta'),
(2, (SELECT id FROM users WHERE username = 'tu_yo_del_futuro'), 'me_encanta'),
(3, (SELECT id FROM users WHERE username = 'el_memo'), 'risa'),
(3, (SELECT id FROM users WHERE username = 'laura_dev'), 'risa'),
(3, (SELECT id FROM users WHERE username = 'ana_segura'), 'me_gusta'),
(4, (SELECT id FROM users WHERE username = 'tu_yo_del_futuro'), 'me_encanta'),
(4, (SELECT id FROM users WHERE username = 'el_paranoico'), 'me_gusta'),
(5, (SELECT id FROM users WHERE username = 'el_paranoico'), 'me_gusta'),
(6, (SELECT id FROM users WHERE username = 'laura_dev'), 'me_gusta'),
(7, (SELECT id FROM users WHERE username = 'kernel_404'), 'enojo'),
(7, (SELECT id FROM users WHERE username = 'ana_segura'), 'enojo'),
(8, (SELECT id FROM users WHERE username = 'el_memo'), 'risa'),
(8, (SELECT id FROM users WHERE username = 'kernel_404'), 'me_gusta'),
(9, (SELECT id FROM users WHERE username = 'el_paranoico'), 'enojo'),
(9, (SELECT id FROM users WHERE username = 'laura_dev'), 'sorpresa'),
(9, (SELECT id FROM users WHERE username = 'kernel_404'), 'risa'),
(9, (SELECT id FROM users WHERE username = 'ana_segura'), 'risa'),
(10, (SELECT id FROM users WHERE username = 'ana_segura'), 'me_encanta'),
(10, (SELECT id FROM users WHERE username = 'zeta_musica'), 'me_gusta'),
(11, (SELECT id FROM users WHERE username = 'el_memo'), 'me_encanta'),
(11, (SELECT id FROM users WHERE username = 'laura_dev'), 'me_gusta'),
(12, (SELECT id FROM users WHERE username = 'kernel_404'), 'risa'),
(12, (SELECT id FROM users WHERE username = 'ana_segura'), 'me_gusta');

INSERT INTO comment_reactions (comment_id, user_id, kind) VALUES
(1, (SELECT id FROM users WHERE username = 'ana_segura'), 'me_gusta'),
(3, (SELECT id FROM users WHERE username = 'el_memo'), 'risa'),
(9, (SELECT id FROM users WHERE username = 'ana_segura'), 'risa'),
(15, (SELECT id FROM users WHERE username = 'el_memo'), 'me_gusta'),
(18, (SELECT id FROM users WHERE username = 'laura_dev'), 'enojo'),
(21, (SELECT id FROM users WHERE username = 'ana_segura'), 'me_encanta');
