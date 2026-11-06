// Visual freehub estimate: one engagement of a 54-point ratchet (about 6.7°).
// The installed hub's actual engagement count is not yet recorded in the model.
export const freehubClickAngle=2*Math.PI/54;
export type SuspensionPlayback={percent:number;cassetteAngle:number;releaseFrom:number|null;releaseStartAngle:number};
export const initialSuspensionPlayback:SuspensionPlayback={percent:0,cassetteAngle:0,releaseFrom:null,releaseStartAngle:0};
export function advanceSuspensionPlayback(previous:SuspensionPlayback,value:number):SuspensionPlayback {
  const percent=Number.isFinite(value)?Math.max(0,Math.min(100,value)):0;
  if(percent===previous.percent)return previous;
  if(percent>previous.percent)return {percent,cassetteAngle:previous.cassetteAngle,releaseFrom:null,releaseStartAngle:previous.cassetteAngle};
  const releaseFrom=previous.releaseFrom??previous.percent;
  const releaseStartAngle=previous.releaseFrom===null?previous.cassetteAngle:previous.releaseStartAngle;
  const progress=(releaseFrom-percent)/releaseFrom;
  // One eased step across the entire release, independent of event frequency.
  const eased=progress*progress*(3-2*progress);
  return {percent,cassetteAngle:releaseStartAngle+freehubClickAngle*eased,releaseFrom,releaseStartAngle};
}
