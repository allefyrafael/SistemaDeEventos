import type { MapLocationDto, MapLocationKind, VenueMapDto } from '@eventpass/shared';

/**
 * Contrato publico do componente VenueMap.
 * Propositalmente generico: nenhum dos tipos abaixo referencia nada especifico
 * da este evento, de modo que o componente possa ser reaproveitado
 * em qualquer projeto/evento.
 */

export type VenueMapMode = 'viewer' | 'editor';

/** Tema visual do canvas do mapa. */
export interface VenueMapTheme {
  /** Cor de brilho dominante dos pins. Default = brand accent. */
  accent?: string;
  /** Mostrar grade arquitetonica de fundo. Default: true. */
  gridOn?: boolean;
  /** Aplicar textura de ruido. Default: true. */
  noiseOn?: boolean;
}

/** Evento disparado quando o usuario clica em um ponto livre do mapa (editor). */
export interface VenueMapClickEvent {
  /** Coordenadas em % (0..100) relativas ao viewport do mapa. */
  x: number;
  y: number;
}

export interface VenueMapDragEvent {
  locationId: string;
  x: number;
  y: number;
}

export interface VenueMapProps {
  data: VenueMapDto;
  mode?: VenueMapMode;
  /** Variante de viewport para contexto de uso (ex.: mobile com mapa dominante). */
  viewportMode?: 'default' | 'mobileTall';
  selectedId?: string | null;
  highlightKinds?: MapLocationKind[];
  onSelect?: (location: MapLocationDto | null) => void;
  /** Disparado apenas em modo editor quando o usuario clica no canvas vazio. */
  onCanvasClick?: (e: VenueMapClickEvent) => void;
  /** Disparado em modo editor ao soltar o pin apos arrastar. */
  onLocationDragEnd?: (e: VenueMapDragEvent) => void;
  /** Mensagem mostrada quando nao existem pins no mapa. */
  emptyHint?: string;
  className?: string;
}
