import {describe,it,expect} from "vitest";
import {articulatedShape,motionForPart,partPose} from "./SuspensionRig";
import {suspensionPose,movePoint} from "./suspensionMotion";
import {gxCrankParts} from "./crankPedals";
import {proceduralModel} from "./model";
import {geometryAnchors,sceneScale} from "./geometry";
import {frontBrakeHose,forkParts,forkCrownParts} from "./frontAssembly";
import {rearFrameBrakeHose,caliperHosePort} from "./brakeGeometry";
import {rearShockParts} from "./rearShock";
import {derailleurParts,chainringParts,chainParts,chainWheels,pitchRadius,cassetteTeeth,selectedGear} from "./drivetrainGeometry";
import type {Point,Primitive} from "./primitives";
const scale=(p:Point)=>p.map(v=>v*sceneScale) as Point;
const distance=(p:Point,q:Point)=>Math.hypot(...p.map((v,i)=>v-q[i]!));
function sceneCable(p:Primitive):Primitive {
  if(p.kind!=="sweep")throw Error("Expected hose");
  return {...p,points:p.points.map(scale),radii:p.radii.map(v=>v*sceneScale),depth:p.depth*sceneScale};
}
describe("articulated component attachments",()=>{
  it("moves the lowers and decals while retaining the crown and stanchions",()=>{
    const parts=forkParts();
    expect(forkCrownParts().every(p=>motionForPart("suspension.fork",p)==="fixed")).toBe(true);
    expect(parts.filter(p=>p.kind==="fork-decal"||p.kind==="fork-arch").every(p=>p.motion==="fork-lowers")).toBe(true);
    const stanchions=parts.filter(p=>p.kind==="tube"&&p.radius===18&&p.metalness===.86);
    expect(stanchions).toHaveLength(2);expect(stanchions.every(p=>!p.motion)).toBe(true);
    expect(parts.filter(p=>p.motion==="fork-lowers").length).toBeGreaterThan(20);
  });
  it("separates rolling rotors from the fork/calipers and moves both crank arms together",()=>{
    for(const [end,rotor,caliper] of [["front","front-wheel","fork-lowers"],["rear","rear-wheel","rear"]] as const){
      const parts=proceduralModel.find(binding=>binding.slotId===`brake.${end}`)!.primitives;
      expect(parts.some(part=>motionForPart(`brake.${end}`,part)===rotor)).toBe(true);
      expect(parts.some(part=>motionForPart(`brake.${end}`,part)===caliper)).toBe(true);
    }
    const crank=gxCrankParts();
    expect(crank.some(part=>motionForPart("drivetrain.crank",part)==="pedal-left")).toBe(true);
    expect(crank.some(part=>motionForPart("drivetrain.crank",part)==="pedal-right")).toBe(true);
    expect(crank.filter(part=>!part.motion).every(part=>motionForPart("drivetrain.crank",part)==="crank")).toBe(true);
    const pose=suspensionPose(100);
    expect(partPose("front-wheel",pose)).toBe(pose.frontWheel);
    expect(partPose("crank",pose)).toBe(pose.crank);
    expect(partPose("pedal-left",pose)).toBe(pose.pedalLeft);
    expect(partPose("pedal-right",pose)).toBe(pose.pedalRight);
  });
  it("rotates the chainring face and its marking rigidly with the crank",()=>{
    const parts=chainringParts(),bb=geometryAnchors().bb;
    const face=parts.find(part=>part.kind==="profile")!,marking=parts.find(part=>part.kind==="label")!;
    if(face.kind!=="profile"||marking.kind!=="label")throw Error("Expected chainring face and marking");
    expect(parts.every(part=>motionForPart("drivetrain.chainring",part)==="crank")).toBe(true);
    const tooth:Point=[...face.contour[0]!,face.z];
    const heading=(point:Point)=>Math.atan2(point[1]-bb[1],point[0]-bb[0]);
    for(const percent of [0,50,100,50,0]){
      const pose=suspensionPose(percent),ringPose=partPose(motionForPart("drivetrain.chainring",face),pose);
      expect(ringPose).toBe(partPose("crank",pose));
      for(const point of [tooth,marking.at]){
        const moved=movePoint(point,ringPose);
        expect(heading(moved)-heading(point)).toBeCloseTo(pose.crank.angle,10);
        expect(distance(moved,bb)).toBeCloseTo(distance(point,bb),8);
      }
    }
  });
  it("articulates the cage independently and keeps the rerouted chain on both pulleys",()=>{
    const parts=derailleurParts();
    expect(parts.some(part=>motionForPart("drivetrain.derailleur",part)==="rear")).toBe(true);
    expect(parts.filter(part=>motionForPart("drivetrain.derailleur",part)==="derailleur-cage").length).toBeGreaterThan(10);
    expect(motionForPart("drivetrain.cassette",parts[0]!)).toBe("cassette");
    const original=chainParts()[0]!;if(original.kind!=="chain")throw Error("Expected chain");
    const shape={...original,joints:original.joints.map(scale),pitch:original.pitch*sceneScale};
    for(const percent of [0,50,100,50,0]){
      const pose=suspensionPose(percent,Math.PI/27),moved=articulatedShape(shape,"chain",pose);
      if(moved.kind!=="chain")throw Error("Expected chain");
      for(const wheel of chainWheels.slice(2)){
        const center=scale(movePoint(wheel.center,pose.derailleurCage));
        const wrapped=moved.joints.filter(point=>Math.abs(distance(point,center)-wheel.radius*sceneScale)<1e-8);
        expect(wrapped.length).toBeGreaterThanOrEqual(3);
      }
      expect(partPose("cassette",pose)).toBe(pose.cassette);
      expect(partPose("derailleur-cage",pose)).toBe(pose.derailleurCage);
      expect(moved.joints).toHaveLength(shape.joints.length);
    }
  });
  it("assigns shock eyelets and body decals to the correct telescoping halves",()=>{
    const parts=rearShockParts(),eyelets=parts.filter(p=>p.kind==="sleeve"&&p.outerRadius===15);
    expect(eyelets.map(p=>p.motion)).toEqual(["shock-shaft","shock-body"]);
    expect(parts.filter(p=>p.kind==="shock-decal").every(p=>p.motion==="shock-body")).toBe(true);
  });
  it("keeps hose ends attached to the frame/control and moving calipers",()=>{
    for(const percent of [0,50,100])for(const [end,original] of [["front",frontBrakeHose()],["rear",rearFrameBrakeHose()]] as const){
      const shape=sceneCable(original),pose=suspensionPose(percent),moved=articulatedShape(shape,end==="front"?"front-hose":"rear-hose",pose);
      if(moved.kind!=="sweep"||shape.kind!=="sweep")throw Error("Expected hose");
      expect(moved.points[0]).toEqual(shape.points[0]);
      const expected=scale(movePoint(caliperHosePort(end),end==="front"?pose.fork:pose.rear));
      expect(distance(moved.points.at(-1)!,expected)).toBeLessThan(1e-9);
    }
  });
  it("keeps the closed chain route on the moving cassette and fixed chainring",()=>{
    const original=chainParts()[0]!;if(original.kind!=="chain")throw Error("Expected chain");
    const shape={...original,joints:original.joints.map(scale),pitch:original.pitch*sceneScale};
    for(const percent of [0,50,100]){
      const pose=suspensionPose(percent),moved=articulatedShape(shape,"chain",pose);if(moved.kind!=="chain")throw Error("Expected chain");
      expect(moved.joints).toHaveLength(shape.joints.length);
      expect(moved.joints.every(p=>p.every(Number.isFinite))).toBe(true);
      const cassette=scale(movePoint(chainWheels[0]!.center,pose.rearWheel)),ring=scale(chainWheels[1]!.center);
      const onWheel=(center:Point,r:number)=>moved.joints.filter(p=>Math.abs(distance(p,center)-r*sceneScale)<1e-8).length;
      expect(onWheel(cassette,pitchRadius(cassetteTeeth[selectedGear]!))).toBeGreaterThan(5);
      expect(onWheel(ring,pitchRadius(32))).toBeGreaterThan(5);
      expect(partPose("chain",pose).offset).toEqual([0,0,0]);
    }
  });
});
