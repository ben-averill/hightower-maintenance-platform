import {memo,useMemo} from "react";
import {ModelPrimitive} from "./ModelPrimitive";
import {chainJoints,pitchRadius,cassetteTeeth,selectedGear} from "./drivetrainGeometry";
import {sceneScale} from "./geometry";
import {visibleInInspection,type FrameInspection} from "./frameInspection";
import {movePoint,restingPose,suspensionChainWheels,type RigidPose,type SuspensionPose} from "./suspensionMotion";
import type {Point,Primitive,SlotGeometry,SuspensionPart} from "./primitives";

type Motion=SuspensionPart|"fixed";
export function motionForPart(slotId:string,shape:Primitive):Motion {
  if(shape.motion)return shape.motion;
  if(shape.assembly==="rear-triangle")return "rear";
  if(shape.assembly==="upper-link")return "upper-link";
  if(shape.assembly==="lower-link")return "lower-link";
  if(slotId==="wheel.front")return "front-wheel";
  if(slotId==="wheel.rear")return "rear-wheel";
  if(slotId==="drivetrain.cassette")return "cassette";
  if(slotId==="drivetrain.derailleur")return "rear";
  if(slotId==="drivetrain.crank"||slotId==="drivetrain.chainring")return "crank";
  if(slotId==="drivetrain.chain")return "chain";
  return "fixed";
}
export function partPose(motion:Motion,pose:SuspensionPose):RigidPose {
  switch(motion){
    case "front-wheel":return pose.frontWheel;
    case "crank":return pose.crank;
    case "pedal-left":return pose.pedalLeft;
    case "pedal-right":return pose.pedalRight;
    case "cassette":return pose.cassette;
    case "derailleur-cage":return pose.derailleurCage;
    case "rear":return pose.rear;
    case "rear-wheel":return pose.rearWheel;
    case "upper-link":return pose.upperLink;
    case "lower-link":return pose.lowerLink;
    case "fork-lowers":return pose.fork;
    case "shock-body":return pose.shockBody;
    case "shock-shaft":return pose.shockShaft;
    default:return restingPose;
  }
}
export function articulatedShape(shape:Primitive,motion:Motion,pose:SuspensionPose):Primitive {
  if(pose.fraction===0&&pose.cassette.angle===0)return shape;
  if(motion==="chain"&&shape.kind==="chain"){
    const wheels=suspensionChainWheels(pose);
    const phase=-(pose.cassette.angle-pose.rearWheel.angle)*pitchRadius(cassetteTeeth[selectedGear]!);
    return {...shape,joints:chainJoints(wheels,shape.joints.length,phase).map(p=>p.map(v=>v*sceneScale) as Point)};
  }
  if((motion==="front-hose"||motion==="rear-hose")&&shape.kind==="sweep"){
    return {...shape,points:shape.points.map((p,i)=>{
      const t=i/(shape.points.length-1);
      // Retain the fixed outlet's initial tangent, then blend into the fully
      // moving rear-frame entry without pulling the entire hose taut.
      const u=motion==="front-hose"?Math.max(0,Math.min(1,(t-.32)/.48))
        :Math.max(0,Math.min(1,(t-.06)/((shape.flexEnd??1)-.06)));
      const weight=u*u*(3-2*u),moved=movePoint(p.map(v=>v/sceneScale) as Point,motion==="front-hose"?pose.fork:pose.rear);
      return p.map((v,j)=>v+(moved[j]!*sceneScale-v)*weight) as Point;
    })};
  }
  return shape;
}
const StaticParts=memo(function StaticParts({shapes,faded,statusColor}:{shapes:Primitive[];faded:boolean;statusColor?:string}){
  return <>{shapes.map((shape,i)=><ModelPrimitive key={i} shape={shape} faded={faded} statusColor={statusColor}/>)}</>;
});
function FlexibleParts({shapes,motion,pose,faded,statusColor}:{shapes:Primitive[];motion:Motion;pose:SuspensionPose;faded:boolean;statusColor?:string}){
  const moving=useMemo(()=>shapes.map(shape=>articulatedShape(shape,motion,pose)),[shapes,motion,pose]);
  return <StaticParts shapes={moving} faded={faded} statusColor={statusColor}/>;
}
export function SuspensionParts({binding,pose,inspection,faded,statusColor}:{binding:SlotGeometry;pose:SuspensionPose;inspection:FrameInspection;faded:boolean;statusColor?:string}){
  const assemblies=useMemo(()=>Array.from(new Set(binding.primitives.map(p=>p.assembly??"component"))).map(assembly=>{
    const shapes=binding.primitives.filter(p=>(p.assembly??"component")===assembly);
    return {assembly,shapes,groups:Array.from(new Set(shapes.map(p=>motionForPart(binding.slotId,p)))).map(motion=>({motion,shapes:shapes.filter(p=>motionForPart(binding.slotId,p)===motion)}))};
  }),[binding]);
  return <>{assemblies.map(assembly=><group key={assembly.assembly} name={`${binding.slotId}:${assembly.assembly}`}
    visible={assembly.shapes.some(p=>visibleInInspection(inspection,binding.slotId,p))}>
    {assembly.groups.map(group=>{
      const transform=partPose(group.motion,pose),position=transform.offset.map(v=>v*sceneScale) as Point;
      const flexible=group.motion==="front-hose"||group.motion==="rear-hose"||group.motion==="chain";
      return <group key={group.motion} name={`motion:${binding.slotId}:${group.motion}`} position={position} rotation={[0,0,transform.angle]}>
        {flexible?<FlexibleParts shapes={group.shapes} motion={group.motion} pose={pose} faded={faded} statusColor={statusColor}/>
          :<StaticParts shapes={group.shapes} faded={faded} statusColor={statusColor}/>}
      </group>;
    })}
  </group>)}</>;
}
