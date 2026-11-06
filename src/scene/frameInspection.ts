import type { Primitive } from "./primitives";

export type FrameInspection = "bike" | "front" | "rear" | "links" | "frame";
export type InspectionAngle = "side" | "three-quarter";

// Filter the actual asset groups, rather than rendering a second QA model.
export function visibleInInspection(view: FrameInspection, slotId: string, shape: Primitive): boolean {
  if (view === "bike") return true;
  if (view === "frame") return slotId === "frame" || slotId === "suspension.shock";
  if (slotId !== "frame") return false;
  if (view === "front") return shape.assembly === "front-triangle";
  if (view === "rear") return shape.assembly === "rear-triangle";
  return shape.assembly === "upper-link" || shape.assembly === "lower-link";
}
