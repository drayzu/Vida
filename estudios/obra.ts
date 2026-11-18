/**
 * The whole work, in the order of GUION-vienen.md («Los que vienen», 18 Nov 2026): which study
 * (and which way, and which beats of it) stands for each moment. `?obra` plays them one after
 * another, with a cut between them.
 *
 * It is a rough cut: two moments still have no study (listed in `FALTAN`), and the passages
 * between scenes are cuts. The cut of «De forma en forma» is kept in `OBRA_FORMAS`.
 */

export interface Tramo {
  /** The moments of the script it stands for. */
  n: string;
  nombre: string;
  parte: string;
  /** The study's id, and its way (from 0). */
  id: string;
  estilo?: number;
  /** Beats of the study to play (the whole study if missing). */
  de?: number;
  a?: number;
  /** What is provisional about it. */
  ojo?: string;
}

const APERTURA = 'Apertura · Hoy';
const I = 'I · No es para nosotros';
const II = 'II · Lo que vive';
const III = 'III · Cómo vivirían';
const IV = 'IV · El vacío';
const CIERRE = 'Cierre · Tú';

export const OBRA: Tramo[] = [
  { n: '1–3', nombre: 'Un latido · La Tierra de noche · Lo que estamos haciendo', parte: APERTURA, id: 'hoy' },
  { n: '4–6', nombre: 'Quince segundos · La capa · La ventana', parte: I, id: 'capa' },
  { n: '7', nombre: 'Lejos', parte: I, id: 'lejos' },
  { n: '8–9', nombre: 'No eres tu materia · Un patrón', parte: II, id: 'patron' },
  { n: '10', nombre: 'Otro patrón', parte: II, id: 'simulada', estilo: 0 },
  { n: '11', nombre: 'Salir · la Tierra', parte: III, id: 'sale' },
  { n: '12', nombre: 'Salir · ellos', parte: III, id: 'cruza', ojo: 'Provisional: son líquenes, todavía no cuerpos que salen al vacío.' },
  { n: '13', nombre: 'Juntos · la Tierra', parte: III, id: 'juntos' },
  { n: '14', nombre: 'Juntos · ellos', parte: III, id: 'nace', de: 36.5, ojo: 'Es el final de «Nace».' },
  { n: '16', nombre: 'Sus mundos · el agua sube', parte: III, id: 'mundos', estilo: 0, ojo: 'Falta antes «Sus mundos · la Tierra» (15, el color que pinta el cerebro).' },
  { n: '16', nombre: 'Sus mundos · tres soles', parte: III, id: 'mundos', estilo: 1 },
  { n: '16', nombre: 'Sus mundos · el mar de luz', parte: III, id: 'mundos', estilo: 2 },
  { n: '17', nombre: 'Lo que vive en sus mundos', parte: III, id: 'flotadores', estilo: 2 },
  { n: '18–19', nombre: 'Otro tiempo · tres corazones · diez días', parte: III, id: 'otro' },
  { n: '19', nombre: 'Otro tiempo · un pensamiento', parte: III, id: 'galaxia' },
  { n: '21', nombre: 'Esperar · ellos', parte: III, id: 'frio', ojo: 'Falta antes «Esperar · la Tierra» (20, el tardígrado).' },
  { n: '22', nombre: '¿Siente?', parte: III, id: 'siente' },
  { n: '23–25', nombre: 'Todas partes · Nadie contesta · La pregunta', parte: IV, id: 'vacio' },
  { n: '26', nombre: 'Quizá nos vuelvan a hacer', parte: IV, id: 'azul' },
  { n: '27–29', nombre: 'De vuelta · Ahora · Tú', parte: CIERRE, id: 'vuelta' },
];

/** Moments of GUION-vienen.md that have no study yet. */
export const FALTAN = ['15 Sus mundos · la Tierra', '20 Esperar · la Tierra'];

/** The rough cut of GUION-formas.md («De forma en forma», 15 Nov 2026), kept for reference. */
export const OBRA_FORMAS: Tramo[] = [
  { n: '1–2', nombre: 'Dos · Otro corazón', parte: 'Apertura', id: 'latido', de: 0, a: 37.4 },
  { n: '3–4', nombre: 'Hacia atrás · El comienzo', parte: 'I · De forma en forma', id: 'rastro' },
  { n: '5', nombre: 'Come luz', parte: 'I · De forma en forma', id: 'testigos', estilo: 2 },
  { n: '6–7', nombre: 'Una dentro de otra · Muchos que son uno', parte: 'I · De forma en forma', id: 'dentro' },
  { n: '8', nombre: 'Aprende a ver', parte: 'I · De forma en forma', id: 'color2' },
  { n: '9', nombre: 'Sale del agua', parte: 'I · De forma en forma', id: 'sale' },
  { n: '10', nombre: 'Tú', parte: 'I · De forma en forma', id: 'tu' },
  { n: '11', nombre: 'La capa', parte: 'II · No es para nosotros', id: 'azul', de: 14, a: 23 },
  { n: '12–13', nombre: 'Todo lo que late · Ya no está', parte: 'II · No es para nosotros', id: 'perdida', de: 0, a: 18.5 },
  { n: '14–15', nombre: 'Lo supo · Años después', parte: 'II · No es para nosotros', id: 'duelo' },
  { n: '16', nombre: 'Afuera · cristales', parte: 'II · No es para nosotros', id: 'testigos', estilo: 0 },
  { n: '16', nombre: 'Afuera · dunas', parte: 'II · No es para nosotros', id: 'testigos', estilo: 1 },
  { n: '17', nombre: 'Otros', parte: 'II · No es para nosotros', id: 'flotadores', estilo: 2 },
  { n: '18–20', nombre: 'Lejos · Después · No es para nosotros', parte: 'II · No es para nosotros', id: 'lejos' },
  { n: '21', nombre: 'Fuera del cuerpo', parte: 'II · No es para nosotros', id: 'fuera' },
  { n: '22', nombre: 'Algo se mueve', parte: 'II · No es para nosotros', id: 'simulada', estilo: 0 },
  { n: '23', nombre: 'Cruza', parte: 'III · Lo que viene de nosotros', id: 'cruza' },
  { n: '24–26', nombre: 'Nace · No muere · Muchos que son uno', parte: 'III · Lo que viene de nosotros', id: 'nace' },
  { n: '27', nombre: 'Hace sus mundos · el agua sube', parte: 'III · Lo que viene de nosotros', id: 'mundos', estilo: 0 },
  { n: '27', nombre: 'Hace sus mundos · tres soles', parte: 'III · Lo que viene de nosotros', id: 'mundos', estilo: 1 },
  { n: '27', nombre: 'Hace sus mundos · el mar de luz', parte: 'III · Lo que viene de nosotros', id: 'mundos', estilo: 2 },
  { n: '28', nombre: 'El frío', parte: 'III · Lo que viene de nosotros', id: 'frio' },
  { n: '29–30', nombre: 'Los que esperan · Una dentro de otra', parte: 'IV · Volver', id: 'azul' },
  { n: '31', nombre: 'Volver', parte: 'IV · Volver', id: 'volver' },
  { n: '32–34', nombre: 'No sabemos · Tú sí · Estás aquí', parte: 'Cierre', id: 'cierre' },
];
