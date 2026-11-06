export type Point = [number, number, number];
export type FrameAssembly = "front-triangle" | "rear-triangle" | "upper-link" | "lower-link";
export type SuspensionPart = "fork-lowers" | "front-wheel" | "crank" | "pedal-left" | "pedal-right" | "rear" | "rear-wheel" | "cassette" | "derailleur-cage" | "upper-link" | "lower-link" | "shock-body" | "shock-shaft" | "front-hose" | "rear-hose" | "chain";
type Finish = { motion?: SuspensionPart; color: string; metalness?: number; roughness?: number; assembly?: FrameAssembly };
export type Primitive = Finish &
  (
    | {
        kind: "tube";
        from: Point;
        to: Point;
        radius: number;
        endRadius?: number;
      }
    | { kind: "ring"; at: Point; radius: number; tube: number }
    | { kind: "sleeve"; from: Point; to: Point; innerRadius: number; outerRadius: number; endOuterRadius?: number }
    | { kind: "box"; at: Point; size: Point; rotation?: Point }
    | { kind: "sweep"; points: Point[]; radii: number[]; depth: number; circular?: boolean; smoothFrame?: boolean; flexEnd?: number }
    | {
        kind: "profile";
        contour: [number, number][];
        holes: [number, number][][];
        depth: number;
        bevel: number;
        round: number;
        z: number;
        plane?: "xy" | "zy" | "xz";
        zSlope?: number;
        zOrigin?: number;
        localOffset?: { at: Point; radius: number; amount: number };
        localOffsets?: { at: Point; radius: number; amount: number }[];
        basis?: { origin: Point; right: Point; up: Point; normal: Point };
        // x, y, half-width along each sculpted member's centerline.
        spines?: Point[][];
        skinResolution?: number;
        // Flat cheeks with a rounded perimeter; spine values still taper depth.
        flatFaces?: boolean;
        // Local moulded carbon cheeks: broad faces with small rolled corners.
        flatSections?: { from: Point; to: Point; reach: number; cornerRadius: number; halfWidth: number }[];
        angularSpines?: number[];
        // Corner radius / base half-depth at each spine point (scale independent).
        spineCornerRadii?: number[][];
        underside?: { path: Point[]; radius: number; reach: number; fade: number };
        curves?: { edge: number; control1: [number,number]; control2: [number,number] }[];
        // Circular steering shell blended into the sculpted front triangle.
        headSection?: { top: Point; bottom: Point; topRadius: number; bottomRadius: number; waist?: number;
          boreRadius?: number; topSeatRadius?: number; bottomSeatRadius?: number; seatDepth?: number };
        topSection?: { rear: Point; front: Point; innerRear: Point; innerFront: Point; rearWidth: number; frontWidth: number; cornerRadius?: number };
        seatSection?: { top: Point; axis: Point; radius: number; length: number };
        cradle?: { from: Point; to: Point; radius: number; cornerRadius?: number; tunnel?: { rearExtension: number; frontInset: number; halfWidth: number; halfHeight: number } };
        bores?: { at: Point; radius: number }[];
        // Central clearance between two intact outer carbon cheeks.
        pockets?: { contour: [number,number][]; depth: number; round: number }[];
      }
    | { kind: "surface-shell"; vertices: Point[]; indices: number[] }
    | { kind: "blocks"; blocks: { at: Point; size: Point; rotation: Point }[] }
    | { kind: "chain"; joints: Point[]; pitch: number }
    | { kind: "ergon-grip"; from: Point; to: Point; radius: number; wing: number }
    | { kind: "ergon-saddle"; at: Point; scale: number; layer: "cover" | "shell" }
    | { kind: "fork-decal"; from: Point; to: Point; radius: number; endRadius: number; forward: Point; side: number }
    | { kind: "fork-arch"; root: Point; scale: number }
    | { kind: "shock-decal"; from: Point; to: Point; radius: number; side: number; style: "air-can" | "reservoir" | "volume" }
    | { kind: "tire-decal"; at: Point; majorRadius: number; tubeRadius: number; innerRadius: number; outerRadius: number; angle: number; arc: number; side: number; artwork: "DHF" | "DHR II" | "MAXXIS" }
    | {
        kind: "label";
        at: Point;
        text: string;
        width: number;
        height: number;
        angle: number;
        back?: boolean;
        fitText?: boolean;
        artwork?: "santa-cruz" | "santa-cruz-stacked" | "hightower";
        curvature?: number;
        curvatureAxis?: "x" | "y";
        basis?: { right: Point; normal: Point };
      }
  );
export interface SlotGeometry {
  slotId: string;
  primitives: Primitive[];
}
export type SceneMode =
  "default" | "selected" | "isolated" | "exploded" | "hidden";
export interface PoseTarget {
  position: Point;
  rotation: Point;
  scale: Point;
  opacity: number;
  visible: boolean;
}

export const tube = (
  from: Point,
  to: Point,
  radius: number,
  color = "#161b1e",
  endRadius = radius,
): Primitive => ({ kind: "tube", from, to, radius, endRadius, color });
export const ring = (
  at: Point,
  radius: number,
  thickness: number,
  color = "#161b1e",
): Primitive => ({ kind: "ring", at, radius, tube: thickness, color });
export const box = (
  at: Point,
  size: Point,
  color = "#161b1e",
  rotation: Point = [0, 0, 0],
): Primitive => ({ kind: "box", at, size, color, rotation });
export const sweep = (
  points: Point[],
  radii: number[],
  depth: number,
  color = "#135a58",
): Extract<Primitive, { kind: "sweep" }> => ({ kind: "sweep", points, radii, depth, color });
export const label = (
  at: Point,
  text: string,
  width: number,
  height: number,
  angle = 0,
  color = "#dae67e",
  back = false,
  fitText = false,
): Extract<Primitive, { kind: "label" }> => ({
  kind: "label",
  at,
  text,
  width,
  height,
  angle,
  color,
  back,
  fitText,
});
