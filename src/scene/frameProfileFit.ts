import type {Primitive} from './primitives';
import {profileTrace} from './frameProfileReference';
import {seatAxis} from './frameCoordinates';
import {headForward,headPoint,headSection} from './headTube';
type Profile=Extract<Primitive,{kind:'profile'}>;
type XY=[number,number];
const xy=(x:number,y:number):XY=>profileTrace(x,y).slice(0,2) as XY;
export const referenceInnerUpper=profileTrace(1333,223);
export const referenceInnerLower=profileTrace(1047,789);
export const referenceOuterUpper=profileTrace(1391,309);
export const referenceOuterLower=profileTrace(1110,834);
// Fit the side contours to one registered image. Mechanical anchors remain shared.
export function fitFrameProfile(body:Profile):void {
  body.contour[3]=xy(730,478);
  for(const [index,x,y] of [[8,1391,309],[9,1110,834],[10,1080,879],[13,777,1024],[14,718,1055],[15,676,1040],[16,673,1002],[17,716,892],[20,703,681]])
    body.contour[index!]=xy(x!,y!);
  // The narrow support turns inward before rising into the seat neck.
  body.contour.splice(18,2,xy(735,845),xy(741,804),xy(724,766),xy(716,721));
  // Keep the lower diagonal straight, with the curve confined to the elbow.
  for(const [index,t] of [[11,.4],[12,.77]]) {
    const a=body.contour[10]!,b=body.contour[13]!;body.contour[index!]=[a[0]+(b[0]-a[0])*t!,a[1]+(b[1]-a[1])*t!];
  }
  body.holes[0]=[[786,501],[1274,199],[1337,194],[1333,223],[1047,789],[1018,820],[965,845],[937,845],[876,801],[797,749],[772,692],[739,585],[737,568]].map(([x,y])=>xy(x!,y!));
  body.holes[1]=[[797,811],[873,865],[879,879],[820,915],[789,920],[765,905]].map(([x,y])=>xy(x!,y!));
  const seatUp=seatAxis,topA=body.contour[3]!,topB=body.contour[4]!;
  const topLength=Math.hypot(topB[0]-topA[0],topB[1]-topA[1]),topAxis=[(topB[0]-topA[0])/topLength,(topB[1]-topA[1])/topLength];
  const skirt=body.contour[7]!,shoulder=body.contour[8]!,elbow=body.contour[9]!;
  const length=Math.hypot(shoulder[0]-elbow[0],shoulder[1]-elbow[1]);
  const shaft=[(shoulder[0]-elbow[0])/length,(shoulder[1]-elbow[1])/length],n=[shaft[1]!,-shaft[0]!];
  const handle=((skirt[0]-shoulder[0])*n[0]!+(skirt[1]-shoulder[1])*n[1]!)/(headForward[0]*n[0]!+headForward[1]*n[1]!);
  const corner:XY=[skirt[0]-headForward[0]*handle,skirt[1]-headForward[1]*handle],radial=4*headSection.waist/3;
  const roofJoin=headPoint(0,-26),roofLength=Math.hypot(roofJoin[0]-topA[0],roofJoin[1]-topA[1]);
  // Concentrate the axial rise at the head shoulder; retain the long straight roof.
  body.curves=[{edge:3,control1:[roofJoin[0]-(roofJoin[0]-topA[0])*30/roofLength,roofJoin[1]-(roofJoin[1]-topA[1])*30/roofLength],
    control2:roofJoin.slice(0,2) as XY},
    {edge:7,control1:corner,control2:corner},{edge:5,
    control1:headPoint(40,(2*headSection.topRadius+headSection.bottomRadius)/3-radial).slice(0,2) as XY,
    control2:headPoint(80,(headSection.topRadius+2*headSection.bottomRadius)/3-radial).slice(0,2) as XY},
    {edge:2,control1:[body.contour[2]![0]-seatUp[0]!*18,body.contour[2]![1]-seatUp[1]!*18],
      control2:[topA[0]-topAxis[0]!*17,topA[1]-topAxis[1]!*17]},
    {edge:18,control1:xy(742,829),control2:xy(744,819)},
    {edge:19,control1:xy(741,789),control2:xy(729,779)},
    {edge:20,control1:xy(719,750),control2:xy(719,735)},
    {edge:22,control1:[body.contour[22]![0]+seatUp[0]!*85,body.contour[22]![1]+seatUp[1]!*85],
      control2:[body.contour[0]![0]-seatUp[0]!*85,body.contour[0]![1]-seatUp[1]!*85]}];
  body.topSection={...body.topSection!,rear:[...topA,0],front:[...topB,0],innerRear:[...body.holes[0]![0]!,0],innerFront:[...body.holes[0]![1]!,0]};
  // Widths retain the established rounded rectangular sections; centers follow the new outlines.
  const center=(t:number,width:number)=>{
    const a=referenceInnerLower,b=referenceInnerUpper,c=referenceOuterLower,d=referenceOuterUpper;
    return [(a[0]+(b[0]-a[0])*t+c[0]+(d[0]-c[0])*t)/2,(a[1]+(b[1]-a[1])*t+c[1]+(d[1]-c[1])*t)/2,width] as [number,number,number];
  };
  body.spines![2]=[center(1,30),center(.75,32),center(.5,34),center(0,35),[...xy(978,917),35],body.spines![2]!.at(-1)!];
  // The rear cheek tapers into the narrower, forward-leaning stationary support.
  body.spines![0]=[[...xy(632,378),18],[...xy(717,649),22],[...xy(763,770),29],[...xy(717,936),36.5]];
  body.spines![1]=[[topA[0],topA[1],18],[...(xy(966,361)),19],[...(xy(1274,174)),25],body.spines![1]!.at(-1)!];
}
