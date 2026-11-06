import {describe,it,expect} from "vitest";
import {advanceSuspensionPlayback as advance,initialSuspensionPlayback as initial,freehubClickAngle} from "./suspensionPlayback";
describe("freehub release playback",()=>{
  it("holds the cassette on compression and makes exactly one backward step on release",()=>{
    let state=initial;
    for(let i=1;i<=100;i++){state=advance(state,i);expect(state.cassetteAngle).toBe(0);}
    let previous=0;
    for(let i=99;i>=0;i--){state=advance(state,i);expect(state.cassetteAngle).toBeGreaterThanOrEqual(previous);previous=state.cassetteAngle;}
    expect(state.cassetteAngle).toBeCloseTo(freehubClickAngle,12);
    expect(advance(state,0)).toBe(state);
  });
  it("makes the same step for one reset event and many slider events",()=>{
    const full=advance(initial,100),single=advance(full,0);
    let stepped=full;for(let i=99;i>=0;i--)stepped=advance(stepped,i);
    expect(stepped).toEqual(single);
    const partial=advance(advance(initial,35),0);
    expect(partial.cassetteAngle).toBeCloseTo(freehubClickAngle,12);
  });
  it("preserves the cassette phase across repeated cycles and an interrupted release",()=>{
    let state=initial;
    for(let i=1;i<=5;i++){
      state=advance(state,100);expect(state.cassetteAngle).toBeCloseTo((i-1)*freehubClickAngle,12);
      state=advance(state,0);expect(state.cassetteAngle).toBeCloseTo(i*freehubClickAngle,12);
    }
    state=advance(advance(state,100),50);const phase=state.cassetteAngle;
    state=advance(state,80);expect(state.cassetteAngle).toBe(phase);
    state=advance(state,0);expect(state.cassetteAngle).toBeCloseTo(phase+freehubClickAngle,12);
  });
  it("clamps invalid input and ignores stationary slider events",()=>{
    expect(advance(initial,NaN)).toBe(initial);
    expect(advance(initial,-1)).toBe(initial);
    const full=advance(initial,110);expect(full.percent).toBe(100);
    expect(advance(full,100)).toBe(full);
  });
});
