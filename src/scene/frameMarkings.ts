import { frameAccent } from "./frameColors";
import { Vector3 } from "three";
import { label, type Point, type Primitive } from "./primitives";

export function topTubeMarkings(body:Extract<Primitive,{kind:"profile"}>):Primitive[] {
  const rear=new Vector3(...body.contour[3]!,0),front=new Vector3(...body.contour[4]!,0);
  const right=front.clone().sub(rear).normalize();
  const normal=new Vector3(-right.y,right.x,0);
  // This straight part of the outline is the crown of the rounded top tube.
  // Following it avoids a floating decal and doesn't rebuild the full mesh.
  const origin=rear.lerp(front,.73).addScaledVector(normal,.35).toArray() as Point;
  return [{...label(origin,"HIGHTOWER",82,13,0,frameAccent),artwork:"hightower",curvature:38,
    basis:{right:right.toArray() as Point,normal:normal.toArray() as Point}}];
}
