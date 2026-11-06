import type { Point } from "./primitives";
// Manufacturer geometry, not an installed-bike setting or maintenance specification.
// https://www.santacruzbicycles.com/pages/product-support/hightower-4-my25
export const mediumGeometry = {
    low: { reach: 457, stack: 634, headAngle: 63.9, bbDrop: 32, bbHeight: 341 },
    high: { reach: 460, stack: 632, headAngle: 64.2, bbDrop: 29, bbHeight: 344 },
} as const;
export type GeometrySetting = keyof typeof mediumGeometry;
export const frameDimensions = {
    wheelbase: 1237,
    rearCenter: 436,
    headTube: 120,
    seatTube: 405,
    forkOffset: 44,
    rearHub: 148,
    rearAxle: 12,
    frontHub: 110,
    bbWidth: 73,
    seatpostDiameter: 31.6,
    seatCollarDiameter: 36.4,
    shockLength: 230,
    shockStroke: 57.5,
    frontShockWidth: 40,
    frontShockBolt: 10,
    rearShockWidth: 30,
    rearShockBolt: 8,
} as const;
export const add = (p: Point, x = 0, y = 0, z = 0): Point => [p[0] + x, p[1] + y, p[2] + z];
export const lerp = (a: Point, b: Point, t: number): Point => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
// Geometry stays in millimeters. Only the render boundary changes units.
export const sceneScale = 1 / 550;
export function geometryAnchors(setting: GeometrySetting = "low") {
    const spec = mediumGeometry[setting];
    const angle = spec.headAngle * Math.PI / 180;
    const down: Point = [Math.cos(angle), -Math.sin(angle), 0];
    const bb: Point = [-160, spec.bbHeight, 0];
    const axleHeight = spec.bbHeight + spec.bbDrop;
    const rear: Point = [bb[0] - Math.sqrt(frameDimensions.rearCenter ** 2 - spec.bbDrop ** 2), axleHeight, 0];
    // Prioritize published wheelbase and chainstay length. The rounded front center
    // then differs by about 3 mm; do not force inconsistent inputs to exact equality.
    const front: Point = [rear[0] + frameDimensions.wheelbase, axleHeight, 0];
    const head = add(bb, spec.reach, spec.stack);
    const headBottom = add(head, down[0] * frameDimensions.headTube, down[1] * frameDimensions.headTube);
    const crown = add(headBottom, down[0] * 8, down[1] * 8);
    const forkTop = add(crown, Math.sin(angle) * frameDimensions.forkOffset, Math.cos(angle) * frameDimensions.forkOffset);
    return { spec, bb, rear, front, head, headBottom, crown, forkTop, down, wheelRadius: axleHeight };
}
