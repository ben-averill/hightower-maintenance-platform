import { describe, expect, it } from "vitest";
import { PerspectiveCamera, Vector3 } from "three";
import { floorOpacity } from "./floorVisibility";

describe("floor visibility during camera inspection", () => {
  const camera = new PerspectiveCamera();
  const opacityAt = (degrees: number, distance = 5, targetHeight = 1) => {
    const angle = degrees * Math.PI / 180;
    camera.position.set(0, targetHeight + Math.sin(angle) * distance, Math.cos(angle) * distance);
    camera.lookAt(0, targetHeight, 0);
    return floorOpacity(Math.asin(-camera.getWorldDirection(new Vector3()).y));
  };
  it("keeps normal overhead views grounded and clears the floor before horizontal and below", () => {
    for (const degrees of [8, 15, 45, 89]) expect(opacityAt(degrees)).toBeCloseTo(1);
    for (const degrees of [1, 0, -5, -45, -89]) expect(opacityAt(degrees)).toBeCloseTo(0);
  });
  it("fades continuously and uses view angle rather than zoom or panned camera height", () => {
    let previous = 0;
    for (let degrees = 1; degrees <= 8; degrees += 0.1) {
      const opacity = opacityAt(degrees);
      expect(opacity).toBeGreaterThanOrEqual(previous);
      expect(opacity - previous).toBeLessThan(0.03);
      expect(opacityAt(degrees, 0.5, -2)).toBeCloseTo(opacity);
      expect(opacityAt(degrees, 15, 4)).toBeCloseTo(opacity);
      previous = opacity;
    }
    expect(opacityAt(4.5)).toBeCloseTo(0.5);
  });
});
