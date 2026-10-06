export type CenterCategory =
  | "centre"
  | "glass"
  | "clothes"
  | "plastic"
  | "paper"
  | "generic";

export interface CollectionCenter {
  id: string;
  lat: number;
  lon: number;
  name?: string;
  operator?: string;
  address?: string;
  /** e.g. "recycling_centre", "recycling", "container" */
  type: string;
  /** Human-readable description of accepted materials. */
  materialsLabel: string;
  /** Visual category used to pick marker color/icon. */
  category: CenterCategory;
  /** Opening hours as provided by OSM, e.g. "Mo-Sa 07:00-20:00". */
  openingHours?: string;
  /** Extra free-text description from OSM. */
  description?: string;
  /** e.g. "container", "centre". */
  recyclingType?: string;
  /** Raw OSM tags for the entry. */
  tags: Record<string, string>;
}
