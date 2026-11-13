// The Hightower's factory colorways. Each one themes the interface (see the
// matching [data-theme] block in styles.css) and repaints the 3D bike.
// Moss is the owner's bike; the other frame and logo colours are sampled from
// Santa Cruz product photography and are approximate.
export type ColorwayId = "moss" | "graphite" | "red-rock" | "purple";
export type PaintFinish = "gloss" | "matte";

export interface Colorway {
  id: ColorwayId;
  name: string;
  /** Scene backdrop: the frame colour, as on Santa Cruz's product pages. The darkest layer. */
  canvas: string;
  /** De-emphasised context geometry while a part is isolated. */
  faded: string;
  framePaint: string;
  frameLogo: string;
  finish: PaintFinish;
}

export const colorways: Record<ColorwayId, Colorway> = {
  moss: { id: "moss", name: "Moss", canvas: "#043c38", faded: "#3f6762",
    framePaint: "#043c38", frameLogo: "#edff16", finish: "gloss" },
  graphite: { id: "graphite", name: "Graphite", canvas: "#2e2d2f", faded: "#585759",
    framePaint: "#2e2d2f", frameLogo: "#758979", finish: "matte" },
  "red-rock": { id: "red-rock", name: "Red Rock", canvas: "#a44a36", faded: "#b87b6c",
    framePaint: "#a44a36", frameLogo: "#68291c", finish: "gloss" },
  purple: { id: "purple", name: "Purple", canvas: "#3b3342", faded: "#675e6e",
    framePaint: "#3b3342", frameLogo: "#f2c49a", finish: "matte" },
};

export const defaultColorway: ColorwayId = "moss";
export const isColorway = (value: unknown): value is ColorwayId =>
  typeof value === "string" && Object.hasOwn(colorways, value);
