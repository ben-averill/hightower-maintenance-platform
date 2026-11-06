import { seatAxis } from "./frameCoordinates";
import { saddleParts } from "./ergonSaddle";
import { seatClampParts } from "./seatAssembly";
import { oneUpRemoteParts,axsShifterParts } from "./thumbControls";
import { chainParts, chainringParts, cassetteParts, derailleurParts } from "./drivetrainGeometry";
import { wheelHardware } from "./wheelHardware";
import { rearShockParts } from "./rearShock";
import { gxCrankParts } from "./crankPedals";
import { tireDecals } from "./tireDecal";
import { tireTread } from "./tireTread";
import { rotorParts, caliperParts, rearFrameBrakeHose, rearFrameHoseFitting, rearTriangleHoseFitting } from "./brakeGeometry";
import { barCenter, forkParts, headsetParts, stemParts, handlebarParts, gripParts, brakeControlParts, frontBrakeHose, rearBrakeHose } from "./frontAssembly";
import { label, ring, sweep, tube, type Point, type Primitive, type SlotGeometry } from "./primitives";
import { frameAnchors, sculptedFrame } from "./frameGeometry";
import { add, frameDimensions as dims, geometryAnchors, sceneScale } from "./geometry";
// All construction coordinates and sizes are millimeters. Primary anchors are
// measured; surfaces, link pivots, cable routing and saddle height remain estimates.
const { rear, front, wheelRadius } = geometryAnchors("low");
const rubber = "#171a1b", black = "#11181b";
const { seat } = frameAnchors;
const post = (length: number): Point => add(seat, seatAxis[0] * length, seatAxis[1] * length);
// Keep the riding saddle height as the traced collar moves; shorten the exposed post.
const postExtension=(barCenter[1]-34-seat[1])/seatAxis[1];
const saddle = post(postExtension);

function dropperParts():Primitive[] {
    const parts:Primitive[]=[
        {...tube(seat,post(120),dims.seatpostDiameter/2,"#171c1e"),roughness:.4,metalness:.55},
        {...tube(post(120),post(postExtension-8),12,"#111619"),metalness:.8,roughness:.17},
        tube(post(112),post(119),18,black),
        {...tube(post(119),post(125),18.3,"#282f32"),metalness:.65,roughness:.3},
        tube(post(125),post(129),14,"#121719"),
        // Compact head supports the two rails at Y=-6 without raising the saddle.
        sweep([post(postExtension-14),add(saddle,0,-14)], [11,15],14,black),
        sweep([add(saddle,-26,-14),add(saddle,0,-13),add(saddle,26,-14)], [3.5,5,3.5],24,"#22292c"),
    ];
    for(const x of [-21,21]) {
        parts.push(sweep([add(saddle,x,-1,-24),add(saddle,x,1,0),add(saddle,x,-1,24)], [2.5,3,2.5],4,"#20272a"),
            tube(add(saddle,x,-16),add(saddle,x,2),2.2,"#424b4e"),
            tube(add(saddle,x,2),add(saddle,x,3),3.4,"#141a1d"));
    }
    for(const side of [-1,1]) parts.push(label(add(post(57),0,0,side*(dims.seatpostDiameter/2+.15)),
        "ONEUP",44,9,Math.atan2(seatAxis[1],seatAxis[0]),"#676f70",side<0,true));
    return parts;
}
function wheel(at: Point, hubWidth: number, tireWidth: number, tireModel: "DHF" | "DHR II"): Primitive[] {
    const parts: Primitive[] = [
        { ...ring(at, wheelRadius - 31, 29, rubber), roughness: 0.94, metalness: 0 },
        ring(at, 317, 10, "#20272a"), ring(at, 308, 3, "#31383b"),
        ...wheelHardware(at,hubWidth,tireModel==="DHR II"),
    ];
    parts.push(...tireTread(at,wheelRadius,tireWidth,tireModel));
    parts.push(...tireDecals(at,wheelRadius,tireModel));
    return parts;
}
const millimeterModel: SlotGeometry[] = [
    { slotId: "frame", primitives: [
        ...sculptedFrame(), ...headsetParts(),
        ...seatClampParts(seat),
    ] },
    { slotId: "wheel.front", primitives: wheel(front, dims.frontHub, 63.5, "DHF") },
    { slotId: "wheel.rear", primitives: wheel(rear, dims.rearHub, 60.96, "DHR II") },
    { slotId: "suspension.fork", primitives: forkParts() },
    { slotId: "suspension.shock", primitives: rearShockParts() },
    { slotId: "brake.front", primitives: [...rotorParts("front").map(part=>({...part,motion:"front-wheel" as const})), ...caliperParts("front").map(part=>({...part,motion:"fork-lowers" as const})), ...brakeControlParts(-1), {...frontBrakeHose(),motion:"front-hose"}] },
    { slotId: "brake.rear", primitives: [...rotorParts("rear").map(part=>({...part,motion:"rear-wheel" as const})), ...caliperParts("rear").map(part=>({...part,motion:"rear" as const})), ...brakeControlParts(1), rearBrakeHose(), rearFrameHoseFitting(), rearTriangleHoseFitting(), {...rearFrameBrakeHose(),motion:"rear-hose"}] },
    { slotId: "drivetrain.crank", primitives: gxCrankParts() },
    { slotId: "drivetrain.chainring", primitives: chainringParts() },
    { slotId: "drivetrain.chain", primitives: chainParts() },
    { slotId: "drivetrain.cassette", primitives: cassetteParts() },
    { slotId: "drivetrain.derailleur", primitives: derailleurParts() },
    { slotId: "drivetrain.shifter", primitives: axsShifterParts() },
    { slotId: "cockpit.dropper", primitives: dropperParts() },
    { slotId: "cockpit.dropper-remote", primitives: oneUpRemoteParts() },
    { slotId: "cockpit.saddle", primitives: saddleParts(saddle) },
    { slotId: "cockpit.stem", primitives: stemParts() },
    { slotId: "cockpit.handlebar", primitives: handlebarParts() },
    { slotId: "cockpit.grips", primitives: gripParts() },
];
const scalePoint = (point: Point): Point => [point[0] * sceneScale, point[1] * sceneScale, point[2] * sceneScale];
function toScene(shape: Primitive): Primitive {
    switch (shape.kind) {
        case "surface-shell": return {...shape,vertices:shape.vertices.map(scalePoint)};
        case "ergon-saddle": return {...shape,at:scalePoint(shape.at),scale:shape.scale*sceneScale};
        case "ergon-grip": return {...shape,from:scalePoint(shape.from),to:scalePoint(shape.to),radius:shape.radius*sceneScale,wing:shape.wing*sceneScale};
        case "chain": return { ...shape, joints: shape.joints.map(scalePoint), pitch: shape.pitch*sceneScale };
        case "tire-decal": return { ...shape, at: scalePoint(shape.at), majorRadius: shape.majorRadius*sceneScale,
            tubeRadius: shape.tubeRadius*sceneScale, innerRadius: shape.innerRadius*sceneScale, outerRadius: shape.outerRadius*sceneScale };
        case "shock-decal": return { ...shape, from: scalePoint(shape.from), to: scalePoint(shape.to), radius: shape.radius * sceneScale };
        case "fork-arch": return { ...shape, root: scalePoint(shape.root), scale: shape.scale * sceneScale };
        case "fork-decal": return { ...shape, from: scalePoint(shape.from), to: scalePoint(shape.to), radius: shape.radius*sceneScale, endRadius: shape.endRadius*sceneScale };
        case "profile": return { ...shape,
            contour: shape.contour.map(([x, y]) => [x * sceneScale, y * sceneScale]),
            holes: shape.holes.map(hole => hole.map(([x, y]) => [x * sceneScale, y * sceneScale])),
            depth: shape.depth * sceneScale, bevel: shape.bevel * sceneScale, round: shape.round * sceneScale,
            z: shape.z * sceneScale, zOrigin: (shape.zOrigin ?? 0) * sceneScale,
            localOffset:shape.localOffset?{at:scalePoint(shape.localOffset.at),radius:shape.localOffset.radius*sceneScale,
                amount:shape.localOffset.amount*sceneScale}:undefined,
            localOffsets:shape.localOffsets?.map(offset=>({at:scalePoint(offset.at),radius:offset.radius*sceneScale,
                amount:offset.amount*sceneScale})),
            spines: shape.spines?.map(spine => spine.map(scalePoint)),
            flatSections:shape.flatSections?.map(section=>({from:scalePoint(section.from),to:scalePoint(section.to),
                reach:section.reach*sceneScale,cornerRadius:section.cornerRadius*sceneScale,halfWidth:section.halfWidth*sceneScale})),
            skinResolution:shape.skinResolution?shape.skinResolution*sceneScale:undefined,
            bores:shape.bores?.map(bore=>({at:scalePoint(bore.at),radius:bore.radius*sceneScale})),
            pockets:shape.pockets?.map(pocket=>({contour:pocket.contour.map(([x,y])=>[x*sceneScale,y*sceneScale]),
                depth:pocket.depth*sceneScale,round:pocket.round*sceneScale})),
            topSection:shape.topSection?{rear:scalePoint(shape.topSection.rear),front:scalePoint(shape.topSection.front),
                innerRear:scalePoint(shape.topSection.innerRear),innerFront:scalePoint(shape.topSection.innerFront),
                rearWidth:shape.topSection.rearWidth*sceneScale,frontWidth:shape.topSection.frontWidth*sceneScale,
                cornerRadius:shape.topSection.cornerRadius===undefined?undefined:shape.topSection.cornerRadius*sceneScale}:undefined,
            seatSection:shape.seatSection?{top:scalePoint(shape.seatSection.top),axis:shape.seatSection.axis,
                radius:shape.seatSection.radius*sceneScale,length:shape.seatSection.length*sceneScale}:undefined,
            cradle:shape.cradle?{from:scalePoint(shape.cradle.from),to:scalePoint(shape.cradle.to),radius:shape.cradle.radius*sceneScale,
              cornerRadius:shape.cradle.cornerRadius===undefined?undefined:shape.cradle.cornerRadius*sceneScale,
              tunnel:shape.cradle.tunnel?{rearExtension:shape.cradle.tunnel.rearExtension*sceneScale,
                frontInset:shape.cradle.tunnel.frontInset*sceneScale,halfWidth:shape.cradle.tunnel.halfWidth*sceneScale,
                halfHeight:shape.cradle.tunnel.halfHeight*sceneScale}:undefined}:undefined,
            underside: shape.underside ? {path:shape.underside.path.map(scalePoint),radius:shape.underside.radius*sceneScale,
                reach:shape.underside.reach*sceneScale,fade:shape.underside.fade*sceneScale} : undefined,
            curves: shape.curves?.map(c=>({...c,control1:[c.control1[0]*sceneScale,c.control1[1]*sceneScale],
                control2:[c.control2[0]*sceneScale,c.control2[1]*sceneScale]})),
            headSection: shape.headSection ? {top:scalePoint(shape.headSection.top),bottom:scalePoint(shape.headSection.bottom),
                topRadius:shape.headSection.topRadius*sceneScale,bottomRadius:shape.headSection.bottomRadius*sceneScale,
                waist:shape.headSection.waist===undefined?undefined:shape.headSection.waist*sceneScale,
                boreRadius:shape.headSection.boreRadius===undefined?undefined:shape.headSection.boreRadius*sceneScale,
                topSeatRadius:shape.headSection.topSeatRadius===undefined?undefined:shape.headSection.topSeatRadius*sceneScale,
                bottomSeatRadius:shape.headSection.bottomSeatRadius===undefined?undefined:shape.headSection.bottomSeatRadius*sceneScale,
                seatDepth:shape.headSection.seatDepth===undefined?undefined:shape.headSection.seatDepth*sceneScale} : undefined,
            basis: shape.basis ? {...shape.basis,origin:scalePoint(shape.basis.origin)} : undefined,
        };
        case "sleeve": return { ...shape, from: scalePoint(shape.from), to: scalePoint(shape.to), innerRadius: shape.innerRadius * sceneScale, outerRadius: shape.outerRadius * sceneScale,
            endOuterRadius:shape.endOuterRadius === undefined ? undefined : shape.endOuterRadius * sceneScale };
        case "tube": return { ...shape, from: scalePoint(shape.from), to: scalePoint(shape.to), radius: shape.radius * sceneScale, endRadius: (shape.endRadius ?? shape.radius) * sceneScale };
        case "ring": return { ...shape, at: scalePoint(shape.at), radius: shape.radius * sceneScale, tube: shape.tube * sceneScale };
        case "box": return { ...shape, at: scalePoint(shape.at), size: scalePoint(shape.size) };
        case "sweep": return { ...shape, points: shape.points.map(scalePoint), radii: shape.radii.map(r => r * sceneScale), depth: shape.depth * sceneScale };
        case "blocks": return { ...shape, blocks: shape.blocks.map(b => ({ ...b, at: scalePoint(b.at), size: scalePoint(b.size) })) };
        case "label": return { ...shape, at: scalePoint(shape.at), width: shape.width * sceneScale, height: shape.height * sceneScale,
            curvature:shape.curvature?shape.curvature*sceneScale:undefined };
    }
}
export const proceduralModel: SlotGeometry[] = millimeterModel.map(binding => ({ ...binding, primitives: binding.primitives.map(toScene) }));
