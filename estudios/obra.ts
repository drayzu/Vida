/**
 * The whole work, in the order of GUION-formas.md: which study (and which way, and which beats of
 * it) stands for each moment. `?obra` plays them one after another, with a cut between them.
 *
 * It is a rough cut: every study was made alone, so the passages between them are not made.
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

const APERTURA = 'Apertura';
const I = 'I · De forma en forma';
const II = 'II · No es para nosotros';
const III = 'III · Lo que viene de nosotros';
const IV = 'IV · Volver';
const CIERRE = 'Cierre';

export const OBRA: Tramo[] = [
  { n: '1–2', nombre: 'Dos · Otro corazón', parte: APERTURA, id: 'latido', de: 0, a: 37.4, ojo: 'Estudio del plan anterior: la voz es vieja.' },
  { n: '3–4', nombre: 'Hacia atrás · El comienzo', parte: I, id: 'rastro' },
  { n: '5', nombre: 'Come luz', parte: I, id: 'testigos', estilo: 2 },
  { n: '6–7', nombre: 'Una dentro de otra · Muchos que son uno', parte: I, id: 'dentro' },
  { n: '8', nombre: 'Aprende a ver', parte: I, id: 'color2' },
  { n: '9', nombre: 'Sale del agua', parte: I, id: 'sale' },
  { n: '10', nombre: 'Tú', parte: I, id: 'tu' },
  { n: '11', nombre: 'La capa', parte: II, id: 'azul', de: 14, a: 23, ojo: 'Sin estudio propio: es la Tierra del momento 30, prestada.' },
  { n: '12–13', nombre: 'Todo lo que late · Ya no está', parte: II, id: 'perdida', de: 0, a: 18.5 },
  { n: '14–15', nombre: 'Lo supo · Años después', parte: II, id: 'duelo' },
  { n: '16', nombre: 'Afuera · cristales', parte: II, id: 'testigos', estilo: 0 },
  { n: '16', nombre: 'Afuera · dunas', parte: II, id: 'testigos', estilo: 1 },
  { n: '17', nombre: 'Otros', parte: II, id: 'flotadores', estilo: 2 },
  { n: '18–20', nombre: 'Lejos · Después · No es para nosotros', parte: II, id: 'lejos' },
  { n: '21', nombre: 'Fuera del cuerpo', parte: II, id: 'fuera' },
  { n: '22', nombre: 'Algo se mueve', parte: II, id: 'simulada', estilo: 0 },
  { n: '23', nombre: 'Cruza', parte: III, id: 'cruza' },
  { n: '24–26', nombre: 'Nace · No muere · Muchos que son uno', parte: III, id: 'nace' },
  { n: '27', nombre: 'Hace sus mundos · el agua sube', parte: III, id: 'mundos', estilo: 0 },
  { n: '27', nombre: 'Hace sus mundos · tres soles', parte: III, id: 'mundos', estilo: 1 },
  { n: '27', nombre: 'Hace sus mundos · el mar de luz', parte: III, id: 'mundos', estilo: 2 },
  { n: '28', nombre: 'El frío', parte: III, id: 'frio' },
  { n: '29–30', nombre: 'Los que esperan · Una dentro de otra', parte: IV, id: 'azul' },
  { n: '31', nombre: 'Volver', parte: IV, id: 'volver' },
  { n: '32–34', nombre: 'No sabemos · Tú sí · Estás aquí', parte: CIERRE, id: 'cierre' },
];
