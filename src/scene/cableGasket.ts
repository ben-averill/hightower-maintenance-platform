import { Vector3 } from "three";
import type { Point,Primitive } from "./primitives";

export function frameCableOutlet(surface:Point,direction:Point):Point {
  return new Vector3(...surface).addScaledVector(new Vector3(...direction).normalize(),5).toArray() as Point;
}
// Shared flared rubber gasket, with a real open bore and a buried root.
export function frameCableGasket(surface:Point,direction:Point):Extract<Primitive,{kind:"sleeve"}> {
  return {kind:"sleeve",from:new Vector3(...surface).addScaledVector(new Vector3(...direction).normalize(),-3).toArray() as Point,
    to:frameCableOutlet(surface,direction),innerRadius:2.1,outerRadius:4.2,endOuterRadius:2.8,
    color:"#242d31",roughness:.72,metalness:.05};
}
