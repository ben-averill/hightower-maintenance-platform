import { CatmullRomCurve3,Vector3 } from "three";
import { sweep,type Point } from "./primitives";

// Evenly sampled, relaxed paths avoid tightly spaced corner points producing
// abrupt bends. Circular sections use the transported frame in sweptGeometry.
export function flowingCable(waypoints:Point[],radius=2) {
  const curve=new CatmullRomCurve3(waypoints.map(p=>new Vector3(...p)),false,"centripetal");
  const points=curve.getSpacedPoints(48).map(p=>p.toArray() as Point);
  points[0]=waypoints[0]!;points[points.length-1]=waypoints.at(-1)!;
  return {...sweep(points,points.map(()=>radius),radius,"#20282c"),circular:true};
}
