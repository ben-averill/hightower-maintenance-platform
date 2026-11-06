import { BufferGeometry,Float32BufferAttribute } from "three";
import type { Primitive } from "./primitives";

export function surfaceShellGeometry(shape:Extract<Primitive,{kind:"surface-shell"}>) {
  const geometry=new BufferGeometry();
  geometry.setAttribute("position",new Float32BufferAttribute(shape.vertices.flat(),3));
  geometry.setIndex(shape.indices);geometry.computeVertexNormals();
  geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;
}
