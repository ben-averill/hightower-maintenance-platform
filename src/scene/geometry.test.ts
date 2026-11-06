import { describe, expect, it } from "vitest";
import { geometryAnchors } from "./geometry";
import type { Point } from "./primitives";
const distance = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
describe.each([
    { setting: "low" as const, reach: 457, stack: 634, height: 341, drop: 32, angle: 63.9 },
    { setting: "high" as const, reach: 460, stack: 632, height: 344, drop: 29, angle: 64.2 },
])("Medium $setting layout", ({ setting, reach, stack, height, drop, angle }) => {
    it("places the steering head relative to the bottom bracket", () => {
        const a = geometryAnchors(setting);
        expect(a.head[0] - a.bb[0]).toBeCloseTo(reach, 6);
        expect(a.head[1] - a.bb[1]).toBeCloseTo(stack, 6);
        expect(distance(a.head, a.headBottom)).toBeCloseTo(120, 6);
        const actualAngle = Math.atan2(a.head[1] - a.headBottom[1], a.headBottom[0] - a.head[0]) * 180 / Math.PI;
        expect(actualAngle).toBeCloseTo(angle, 6);
    });
    it("preserves axle alignment, wheelbase and chainstay length", () => {
        const a = geometryAnchors(setting);
        expect(a.front[0] - a.rear[0]).toBeCloseTo(1237, 6);
        expect(distance(a.rear, a.bb)).toBeCloseTo(436, 6);
        expect(a.rear[1]).toBe(a.front[1]);
        expect(a.bb[1]).toBe(height);
        expect(a.front[1] - a.bb[1]).toBe(drop);
        expect(a.wheelRadius).toBe(373);
        // Published dimensions are rounded, so front center is a tolerance check.
        expect(Math.abs(distance(a.front, a.bb) - 800)).toBeLessThan(4);
    });
    it("keeps the fork axis consistent within published rounding", () => {
        const a = geometryAnchors(setting);
        const actualOffset = (a.front[0] - a.headBottom[0]) * -a.down[1] + (a.front[1] - a.headBottom[1]) * a.down[0];
        expect(Math.abs(actualOffset - 44)).toBeLessThan(2);
        const length = distance(a.front, a.forkTop);
        const alignment = ((a.front[0] - a.forkTop[0]) * a.down[0] + (a.front[1] - a.forkTop[1]) * a.down[1]) / length;
        expect(alignment).toBeGreaterThan(0.9999);
    });
});
