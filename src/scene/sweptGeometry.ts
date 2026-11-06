import { BufferGeometry, CatmullRomCurve3, Float32BufferAttribute, Quaternion, Vector3 } from "three";
import type { Primitive } from "./primitives";
export function sweptGeometry(
  shape: Extract<Primitive, { kind: "sweep" }>,
): BufferGeometry {
  const curve = new CatmullRomCurve3(
    shape.points.map((point) => new Vector3(...point)),
    false,
    "centripetal",
  );
  const segments = Math.max(20, shape.points.length * 10);
  const sides = shape.circular ? 32 : 16;
  const positions: number[] = [],
    indices: number[] = [];
  let previousTangent=curve.getTangent(0).normalize();
  let transportedNormal=new Vector3(0,1,0);
  if(Math.abs(previousTangent.y)>.95) transportedNormal.set(1,0,0);
  transportedNormal.cross(previousTangent).normalize();
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const at = curve.getPoint(t),
      tangent = curve.getTangent(t);
    const up =
      Math.abs(tangent.z) > 0.95 ? new Vector3(0, 1, 0) : new Vector3(0, 0, 1);
    // Transport each circular section from its predecessor. Switching reference
    // axes at a slope threshold twisted whole rings and pinched the bar bends.
    if(shape.circular || shape.smoothFrame) {
      transportedNormal.applyQuaternion(new Quaternion().setFromUnitVectors(previousTangent,tangent));
      transportedNormal.addScaledVector(tangent,-transportedNormal.dot(tangent)).normalize();
      previousTangent=tangent.clone();
    }
    const normal = shape.circular || shape.smoothFrame ? transportedNormal.clone() : up.cross(tangent).normalize();
    const binormal = tangent.clone().cross(normal).normalize();
    const rIndex = t * (shape.radii.length - 1);
    const lower = Math.floor(rIndex);
    const fraction=rIndex-lower,blend=shape.circular?fraction*fraction*(3-2*fraction):fraction;
    const radius =
      (shape.radii[lower] ?? 0.04) * (1 - blend) +
      (shape.radii[Math.min(lower + 1, shape.radii.length - 1)] ?? 0.04) *
        blend;
    for (let j = 0; j <= sides; j++) {
      const angle = (j * Math.PI * 2) / sides;
      const p = at
        .clone()
        .addScaledVector(normal, Math.cos(angle) * radius)
        .addScaledVector(binormal, Math.sin(angle) * (shape.circular ? radius : shape.depth));
      positions.push(p.x, p.y, p.z);
      if (i < segments && j < sides) {
        const a = i * (sides + 1) + j,
          b = a + sides + 1;
        indices.push(a, a + 1, b, b, a + 1, b + 1);
      }
    }
  }
  // Cap the sweep ends so frame tubes remain solid when viewed from below.
  for (const end of [0, segments]) {
    const center = curve.getPoint(end / segments);
    const index = positions.length / 3;
    positions.push(center.x, center.y, center.z);
    for (let j = 0; j < sides; j++) {
      const a = end * (sides + 1) + j;
      indices.push(...(end === 0 ? [index, a + 1, a] : [index, a, a + 1]));
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  // The seam vertices occupy the same position but have different neighbours.
  const normals=geometry.getAttribute("normal");
  for(let i=0;i<=segments;i++) {
    const a=i*(sides+1),b=a+sides;
    const average=new Vector3().fromBufferAttribute(normals,a).add(new Vector3().fromBufferAttribute(normals,b)).normalize();
    normals.setXYZ(a,average.x,average.y,average.z);normals.setXYZ(b,average.x,average.y,average.z);
  }
  geometry.computeBoundingBox();geometry.computeBoundingSphere();
  return geometry;
}
