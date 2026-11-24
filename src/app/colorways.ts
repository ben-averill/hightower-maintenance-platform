// The Hightower's factory colorways. Each one themes the interface (see the
// matching [data-theme] block in styles.css) and repaints the 3D bike.
// Moss is the owner's bike; the other frame and logo colours are sampled from
// Santa Cruz product photography and are approximate.
export type ColorwayId = "moss" | "graphite" | "red-rock" | "purple";
export type PaintFinish = "gloss" | "matte" | "satin-metallic";

export interface Colorway {
  id: ColorwayId;
  name: string;
  /** Studio backdrop, sampled from Santa Cruz's Hightower product page. */
  canvas: string;
  /** Peak of the pool of light on the studio floor under the bike. */
  glow: string;
  /** De-emphasised context geometry while a part is isolated. */
  faded: string;
  framePaint: string;
  frameLogo: string;
  finish: PaintFinish;
}

// Paint values are darker than they look on screen: the studio lighting lifts
// them to roughly the frame colours in Santa Cruz's photos.
export const colorways: Record<ColorwayId, Colorway> = {
  moss: { id: "moss", name: "Moss", canvas: "#14373e", glow: "#1b4c52", faded: "#35575f",
    framePaint: "#063f48", frameLogo: "#edff16", finish: "gloss" },
  graphite: { id: "graphite", name: "Graphite", canvas: "#414141", glow: "#595959", faded: "#626262",
    framePaint: "#2e2d2f", frameLogo: "#758979", finish: "matte" },
  "red-rock": { id: "red-rock", name: "Red Rock", canvas: "#9c4630", glow: "#c05d43", faded: "#af8175",
    framePaint: "#8a4634", frameLogo: "#511d13", finish: "gloss" },
  purple: { id: "purple", name: "Purple", canvas: "#342d3f", glow: "#473c54", faded: "#544c60",
    framePaint: "#443b52", frameLogo: "#fcc18a", finish: "satin-metallic" },
};

export const defaultColorway: ColorwayId = "moss";
export const isColorway = (value: unknown): value is ColorwayId =>
  typeof value === "string" && Object.hasOwn(colorways, value);
