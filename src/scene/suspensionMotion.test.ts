import {describe,it,expect} from "vitest";
import {movePoint,suspensionPose,suspensionChainWheels} from "./suspensionMotion";
import {chainRoute,chainWheels,derailleurCagePivot,lowerPulley,upperPulley} from "./drivetrainGeometry";
import {crankPoint} from "./crankPedals";
import {frameAnchors} from "./frameCoordinates";
import {frameDimensions,geometryAnchors} from "./geometry";
const {rear,front,down,wheelRadius,bb}=geometryAnchors();
const {upperPivot:a,rearPivot:b,lowerPivot:c,lowerRearPivot:d,shockRear,shockFront}=frameAnchors;
const distance=(p:readonly number[],q:readonly number[])=>Math.hypot(...p.map((v,i)=>v-q[i]!));
const near=(p:readonly number[],q:readonly number[])=>expect(distance(p,q)).toBeLessThan(1e-6);
describe("suspension travel rig",()=>{
  it("preserves the exact resting model at zero and clamps the range",()=>{
    const pose=suspensionPose(0);
    for(const transform of [pose.rear,pose.rearWheel,pose.derailleurCage,pose.cassette,pose.frontWheel,pose.crank,pose.pedalLeft,pose.pedalRight,pose.upperLink,pose.lowerLink,pose.fork,pose.shockBody,pose.shockShaft,pose.ground]){
      expect(transform.angle).toBe(0);expect(transform.offset).toEqual([0,0,0]);
    }
    expect(suspensionPose(-10)).toEqual(pose);expect(suspensionPose(NaN)).toEqual(pose);
    expect(suspensionPose(110)).toEqual(suspensionPose(100));
  });
  it("reaches 150 mm rear wheel travel and 160 mm along the fork axis",()=>{
    for(const percent of [0,25,50,75,100]){
      const pose=suspensionPose(percent),rearAxle=movePoint(rear,pose.rear);
      expect(rearAxle[1]-rear[1]).toBeCloseTo(150*percent/100,6);
      const frontAxle=movePoint(front,pose.fork);
      expect(distance(front,frontAxle)).toBeCloseTo(160*percent/100,6);
      expect((frontAxle[0]-front[0])*down[0]+(frontAxle[1]-front[1])*down[1]).toBeCloseTo(-160*percent/100,6);
    }
  });
  it("closes both rigid links and the rear triangle throughout the stroke",()=>{
    for(let percent=0;percent<=100;percent++){
      const pose=suspensionPose(percent),upper=movePoint(b,pose.rear),lower=movePoint(d,pose.rear);
      near(movePoint(a,pose.upperLink),a);near(movePoint(c,pose.lowerLink),c);
      near(movePoint(b,pose.upperLink),upper);near(movePoint(d,pose.lowerLink),lower);
      expect(distance(upper,lower)).toBeCloseTo(distance(b,d),6);
      expect(distance(a,upper)).toBeCloseTo(distance(a,b),6);
      expect(distance(c,lower)).toBeCloseTo(distance(c,d),6);
    }
  });
  it("keeps both wheels on the floor while the frame settles",()=>{
    for(const percent of [0,10,50,90,100]){
      const pose=suspensionPose(percent);
      expect(movePoint(movePoint(rear,pose.rearWheel),pose.ground)[1]).toBeCloseTo(wheelRadius,6);
      expect(movePoint(movePoint(front,pose.fork),pose.ground)[1]).toBeCloseTo(wheelRadius,6);
    }
    expect(movePoint(geometryAnchors().bb,suspensionPose(100).ground)[1]).toBeLessThan(200);
  });
  it("rolls the front tyre without slip and keeps the stationary rear tyre still",()=>{
    let previous=0;
    for(let percent=0;percent<=100;percent++){
      const pose=suspensionPose(percent);
      const center=movePoint(movePoint(front,pose.frontWheel),pose.ground);
      near(center,movePoint(movePoint(front,pose.fork),pose.ground));
      const worldAngle=pose.frontWheel.angle+pose.ground.angle;
      expect(worldAngle*wheelRadius+center[0]-front[0]).toBeCloseTo(0,8);
      expect(worldAngle).toBeGreaterThanOrEqual(previous-1e-9);
      expect(pose.rearWheel.angle+pose.ground.angle).toBeCloseTo(0,10);
      previous=worldAngle;
    }
    expect(previous).toBeGreaterThan(.15);
  });
  it("adds subtle chain-growth kickback and reverses it exactly on release",()=>{
    const compression=Array.from({length:101},(_,i)=>suspensionPose(i));
    let previous=0;
    for(let percent=0;percent<=100;percent++){
      const pose=compression[percent]!;
      near(movePoint(bb,pose.crank),bb);
      expect(pose.chainGrowth).toBeCloseTo(Math.max(0,distance(bb,movePoint(rear,pose.rear))-distance(bb,rear)),8);
      expect(pose.crank.angle).toBeGreaterThanOrEqual(previous-1e-9);
      for(const side of [-1,1]){
        const pedal=side<0?pose.pedalLeft:pose.pedalRight,axle=crankPoint(side,170);
        near(movePoint(axle,pedal),movePoint(axle,pose.crank));
        expect(pedal.angle+pose.ground.angle).toBeCloseTo(0,10);
      }
      previous=pose.crank.angle;
    }
    expect(previous*180/Math.PI).toBeGreaterThan(1);
    expect(previous*180/Math.PI).toBeLessThan(6);
    for(let percent=100;percent>=0;percent--)expect(suspensionPose(percent)).toEqual(compression[percent]);
  });
  it("extends the cage on its clutch pivot with visible forward motion and attached pulleys",()=>{
    const length=(wheels:typeof chainWheels)=>chainRoute(wheels).reduce((sum,segment)=>sum+segment.length,0);
    const restingLength=length(chainWheels);
    let previous=0;
    for(let percent=0;percent<=100;percent++){
      const pose=suspensionPose(percent),wheels=suspensionChainWheels(pose);
      near(movePoint(derailleurCagePivot,pose.derailleurCage),movePoint(derailleurCagePivot,pose.rear));
      expect(distance(wheels[2]!.center,wheels[3]!.center)).toBeCloseTo(distance(lowerPulley,upperPulley),8);
      // Chain routing stays finite and close to its original length in this
      // estimated visual model; no links pop in or disappear on scrubbing.
      expect(Math.abs(length(wheels)-restingLength)).toBeLessThan(restingLength*.04);
      const extension=pose.derailleurCage.angle-pose.rear.angle;
      expect(extension).toBeGreaterThanOrEqual(previous-1e-9);
      previous=extension;
    }
    expect(previous).toBeGreaterThan(.4);expect(previous).toBeLessThan(1.2);
    const halfway=suspensionPose(50);
    expect(previous).toBeGreaterThan(halfway.derailleurCage.angle-halfway.rear.angle);
    const full=suspensionPose(100);
    expect(movePoint(lowerPulley,full.derailleurCage)[0]).toBeGreaterThan(movePoint(lowerPulley,full.rear)[0]+10);
    expect(full.derailleurCage.angle+full.ground.angle).toBeGreaterThan(15*Math.PI/180);
    expect(suspensionPose(0).derailleurCage.angle).toBe(0);
  });
  it("rotates the cassette independently without moving its axle or the rear wheel",()=>{
    const angle=2*Math.PI/54;
    for(const percent of [100,50,0]){
      const pose=suspensionPose(percent,angle);
      near(movePoint(rear,pose.cassette),movePoint(rear,pose.rearWheel));
      expect(pose.cassette.angle-pose.rearWheel.angle).toBeCloseTo(angle,12);
      expect(pose.rearWheel.angle+pose.ground.angle).toBeCloseTo(0,12);
    }
  });
  it("keeps shock eyelets attached and within the 57.5 mm stroke",()=>{
    let previous:number=frameDimensions.shockLength;
    for(let percent=0;percent<=100;percent++){
      const pose=suspensionPose(percent);
      near(movePoint(shockFront,pose.shockBody),shockFront);
      near(movePoint(shockRear,pose.shockShaft),movePoint(shockRear,pose.lowerLink));
      expect(pose.shockLength).toBeLessThanOrEqual(previous+1e-8);
      expect(pose.shockLength).toBeGreaterThanOrEqual(frameDimensions.shockLength-frameDimensions.shockStroke);
      previous=pose.shockLength;
    }
  });
});
