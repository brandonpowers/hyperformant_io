// theme-renderer.ts
// TypeScript contract + helper stubs for mapping data → visuals per ThemeConfig

import type { ThemeConfig } from "./theme-config";

/** ------- Data Layer Contracts (your unified domains) ------- */

export type EntityId = string;

export type EntityProfile = {
  id: EntityId;
  name: string;
  profile: {
    industry?: string;
    market?: string;
    geography?: string;
    // ...more static attributes
  };
  metric: Record<string, number | undefined>; // e.g., marketCap, revenue, traffic, growth, etc.
  index:  Record<string, number | undefined>; // e.g., momentum, techVelocity, mindshare, threat, etc.
  signal: {
    positive?: number;   // recent window magnitude (0..1)
    negative?: number;   // recent window magnitude (0..1)
    competitive?: number;
    product?: number;
    deal?: number;
    // extend freely
    [k: string]: number | undefined;
  };
};

export type Connection = {
  source: EntityId;
  target: EntityId;
  type: string; // e.g., partnership, competitor, mna, investorPortfolio, etc.
  sentiment?: number; // -1..1
  strength?: number;  // 0..1 generic strength
  overlapScore?: number;
  depth?: number;
  dealValue?: number;
  allianceDepth?: number;
  severity?: number;
  criticality?: number;
  collabDepth?: number;
  sharedModules?: number;
  equityPct?: number;
  checkSize?: number;
  integrationDepth?: number;
  // ...more typed fields fine; renderer will use the theme's "thickness.key"
};

/** ------- Visual Model emitted to react-three-fiber ------- */

export type Vec3 = { x: number; y: number; z: number };

export type VisualNode = {
  id: EntityId;
  name: string;
  position: Vec3;      // normalized -0.5..+0.5 cube
  size: number;        // 0..1 normalized; renderer scales to world units
  color: number;       // packed color (0xRRGGBB) or use string if you prefer
  glow: number;        // 0..1 pulse intensity
  drift: Vec3;         // small vector for micro-movement
  meta: EntityProfile; // keep for tooltips/side panel
};

export type VisualEdge = {
  source: EntityId;
  target: EntityId;
  thickness: number;           // normalized 0..1
  color: number;               // packed color or string
  dashed: boolean;
  particles: boolean;
  pulsesOnActive: boolean;
  meta: Connection;
};

export type VisualBackground = {
  clustersBy?: "industry"|"market";
  halos: boolean;
  axes: boolean;
};

/** ------- Theme Application ------- */

export type ThemeInputs = {
  theme: ThemeConfig;
  entities: EntityProfile[];
  connections: Connection[];
  palette: {
    industry: (industry?: string) => number;     // mapping fn → color
    market: (market?: string) => number;         // optional
    typeColor: (type: string) => number;         // connection type → color
    sentimentColor: (s?: number) => number;      // -1..1 → color
    scaleColor: (v?: number) => number;          // 0..1 → color ramp
  };
  normalize: {
    position: (v?: number) => number;            // 0..1 clamp; renderer will center to [-0.5, 0.5]
    size: (v?: number) => number;                // map raw metric to 0..1 (handles fallbacks)
    thickness: (v?: number, scale?: "linear"|"log") => number;
  };
  getCompound: (entity: EntityProfile, keyExpr: string) => number | undefined;
  getConnValue: (conn: Connection, keyExpr: string) => number | undefined;
};

/**
 * Apply a theme to raw entities+connections → visual nodes/edges/background.
 * Keep this pure & synchronous so it can run in workers if needed.
 */
export function applyTheme(inputs: ThemeInputs): {
  nodes: VisualNode[];
  edges: VisualEdge[];
  background: VisualBackground;
} {
  const { theme, entities, connections, palette, normalize, getCompound, getConnValue } = inputs;

  const nodes: VisualNode[] = entities.map(e => {
    // Position from indices
    const x = normalize.position(getCompound(e, theme.encodings.position.x));
    const y = normalize.position(getCompound(e, theme.encodings.position.y));
    const z = normalize.position(getCompound(e, theme.encodings.position.z));
    // Center to [-0.5, 0.5] for 3D scene convenience
    const position = { x: (x ?? 0.5) - 0.5, y: (y ?? 0.5) - 0.5, z: (z ?? 0.5) - 0.5 };

    // Size (supports fallbacks via "a|b|c")
    const size = normalize.size(getCompound(e, theme.encodings.size));

    // Color
    let color = 0xffffff;
    if (theme.encodings.color.mode === "palette") {
      color = palette.industry(e.profile.industry);
    } else {
      color = palette.scaleColor(getCompound(e, theme.encodings.color.key));
    }

    // Glow intensity from signals
    const glowKey = theme.encodings.glow.key;
    const rawGlow = getCompound(e, glowKey);
    const glow = clamp01((rawGlow ?? 0) * glowIntensityMultiplier(theme.encodings.glow.intensity));

    // Drift vector from trend key
    const driftMag = clamp01(getCompound(e, theme.encodings.drift.key) ?? 0) * 0.015; // small
    const drift: Vec3 = { x: driftMag, y: 0, z: 0 }; // simple X drift; replace with nicer vector field if desired

    return {
      id: e.id,
      name: e.name,
      position,
      size,
      color,
      glow,
      drift,
      meta: e
    };
  });

  const includeSet = new Set(theme.connections.include);
  const edges: VisualEdge[] = connections
    .filter(c => includeSet.has(c.type))
    .map(c => {
      // Thickness
      const tVal = getConnValue(c, theme.connections.thickness.key);
      const thickness = normalize.thickness(tVal, theme.connections.thickness.scale);

      // Color
      let edgeColor = 0xffffff;
      if (theme.connections.color.by === "type") edgeColor = palette.typeColor(c.type);
      else if (theme.connections.color.by === "sentiment") edgeColor = palette.sentimentColor(c.sentiment);
      else edgeColor = hybridTypeSentiment(palette, c.type, c.sentiment);

      // Pattern / animation
      const dashed = !!theme.connections.pattern.rivalryDashed && c.type === "competitor";
      const particles = !!theme.connections.animation.particles;
      const pulsesOnActive = !!theme.connections.animation.pulsesOnActive;

      return {
        source: c.source,
        target: c.target,
        thickness,
        color: edgeColor,
        dashed,
        particles,
        pulsesOnActive,
        meta: c
      };
    });

  const background: VisualBackground = {
    clustersBy: theme.background.clustersBy,
    halos: theme.background.halos,
    axes: theme.background.axes
  };

  return { nodes, edges, background };
}

/** ------- Default helpers (you can replace with your own) ------- */

export function defaultGetCompound(entity: EntityProfile, keyExpr: string | undefined): number | undefined {
  if (!keyExpr) return undefined;
  // support fallbacks: "metric.marketCap|metric.revenue|metric.traffic"
  for (const key of keyExpr.split("|")) {
    const [domain, field] = key.split(".");
    if (domain === "profile") continue; // profiles aren't numeric
    if (domain === "metric") {
      const v = entity.metric[field];
      if (isFiniteNumber(v)) return v as number;
    } else if (domain === "index") {
      const v = entity.index[field];
      if (isFiniteNumber(v)) return v as number;
    } else if (domain === "signal") {
      const v = entity.signal[field];
      if (isFiniteNumber(v)) return v as number;
    }
  }
  return undefined;
}

export function defaultGetConnValue(conn: Connection, keyExpr: string | undefined): number | undefined {
  if (!keyExpr) return undefined;
  for (const key of keyExpr.split("|")) {
    const [, field] = key.split("."); // "connection.strength" → "strength"
    const v = (conn as any)[field];
    if (isFiniteNumber(v)) return v as number;
  }
  return undefined;
}

export const defaultNormalize = {
  position: (v?: number) => clamp01(v ?? 0.5),                   // already 0..1 indices preferred
  size: (v?: number) => clamp01(scaleToUnit(v)),                 // map metric to 0..1
  thickness: (v?: number, scale: "linear"|"log" = "linear") => {
    const val = Math.max(0, v ?? 0);
    if (scale === "log") return clamp01(Math.log10(1 + val) / Math.log10(1 + 1e3)); // assumes max ~1e3
    return clamp01(val);
  }
};

export const defaultPalette = {
  industry: (industry?: string) => hashColor(industry ?? "unknown"),
  market: (market?: string) => hashColor(market ?? "unknown"),
  typeColor: (type: string) => hashColor(type),
  sentimentColor: (s?: number) => {
    const v = clamp01(((s ?? 0) + 1) / 2); // -1..1 → 0..1
    return lerpColor(0x3b82f6, 0xf59e0b, v); // blue→amber
  },
  scaleColor: (v?: number) => lerpColor(0x60a5fa, 0xf97316, clamp01(v ?? 0))
};

/** ------- Tiny utilities ------- */

function clamp01(n: number) { return Math.max(0, Math.min(1, n)); }
function isFiniteNumber(v: any): v is number { return typeof v === "number" && Number.isFinite(v); }
function scaleToUnit(v?: number) {
  if (v == null || !Number.isFinite(v)) return 0;
  // naive: assume already normalized-ish; replace with z-score/minmax as needed
  return Math.max(0, Math.min(1, v));
}
function glowIntensityMultiplier(level: "low"|"med"|"high") {
  return level === "high" ? 1.0 : level === "med" ? 0.6 : 0.35;
}
function hybridTypeSentiment(palette: any, type: string, s?: number) {
  const base = palette.typeColor(type);
  // modulate brightness by sentiment (simple approach)
  const t = clamp01(((s ?? 0) + 1) / 2); // 0..1
  return tintColor(base, 0.6 + 0.4 * t);
}
function tintColor(hex: number, factor: number) {
  const r = ((hex >> 16) & 0xff) * factor;
  const g = ((hex >> 8) & 0xff) * factor;
  const b = (hex & 0xff) * factor;
  return ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff);
}
function lerpColor(a: number, b: number, t: number) {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}
function hashColor(s: string) {
  let h = 0; for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  const r = (h & 0xff0000) >> 16, g = (h & 0x00ff00) >> 8, b = h & 0x0000ff;
  return ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff);
}

/** ------- Example wiring (use your real data + r3f scene) ------- */
// import { THEMES } from "./theme-config";
// const { nodes, edges, background } = applyTheme({
//   theme: THEMES[0],
//   entities: myEntities,
//   connections: myConnections,
//   palette: defaultPalette,
//   normalize: defaultNormalize,
//   getCompound: defaultGetCompound,
//   getConnValue: defaultGetConnValue
// });
// <ThemeScene nodes={nodes} edges={edges} background={background} />
