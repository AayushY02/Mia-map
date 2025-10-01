export type GeometryKind = "point" | "line" | "polygon";

export type StyleMode = "single" | "categorical" | "graduated";
export type GraduatedMethod = "equal" | "quantile" | "jenks";

/** Uploaded icon per category value */
export type IconRecord = {
  /** Stable image id on the style sprite (user-<layer>-icon-<slug>) */
  id: string;
  /** Data URL for persistence (PNG/SVG) */
  dataUrl: string;
};

export type IconMap = Record<string, IconRecord>;

export type UserGeomStyle = {
  visible: boolean;
  mode: StyleMode;
  color: string;                 // for single
  opacity: number;               // 0..1
  // categorical color
  catProperty?: string;
  catMapping?: Record<string, string>;
  catDefault?: string;
  // graduated color
  gradProperty?: string;
  gradMethod?: GraduatedMethod;
  gradClasses?: number;
  gradBreaks?: number[];
  gradPalette?: string[];
  // common sizes
  size?: number;                 // circle radius base OR line width base
  outlineColor?: string;
  outlineWidth?: number;
  labelProperty?: string;
  labelSize?: number;

  /** Rendering mode for points */
  render?: "auto" | "circle" | "icon";
  /** Category property to choose icon by (string) */
  iconProperty?: string;
  /** Mapping of category value → uploaded icon */
  iconMap?: IconMap;
  /** Icon scale (MapLibre "icon-size") */
  iconSize?: number;
};

export type FilterLogic = "AND" | "OR";
export type FilterRule = {
  prop: string;
  op: "==" | "!=" | ">" | ">=" | "<" | "<=" | "between" | "contains";
  value?: string | number | boolean;
  /** used when op=between */
  value2?: number;
  /** for contains on string props */
  caseInsensitive?: boolean;
};
export type UserLayerFilters = {
  logic: FilterLogic;
  rules: FilterRule[];
};

export type UserLayer = {
  id: string;
  name: string;
  filename?: string;
  data: GeoJSON.FeatureCollection;
  createdAt: number;

  /** per-geometry substyles */
  styles: Partial<Record<GeometryKind, UserGeomStyle>>;

  /** optional filters (applied to all sublayers) */
  filters?: UserLayerFilters;
};
