import { createContext,useContext } from "react";
import { colorways,defaultColorway,type Colorway,type PaintFinish } from "../app/colorways";
import { frameAccent,framePaint } from "./frameColors";

export const ColorwayContext=createContext<Colorway>(colorways[defaultColorway]);

// Geometry is authored in the owner's Moss paint; the selected colorway
// repaints the frame finish and its graphics at render time.
export function usePaint(color:string) {
  const colorway=useContext(ColorwayContext);
  return color===framePaint?colorway.framePaint:color===frameAccent?colorway.frameLogo:color;
}

const finishes:Record<PaintFinish,{roughness:number;metalness:number;clearcoat:number;clearcoatRoughness:number}>={
  // Mirror-like clear coat over a smooth base: highlights stay sharp streaks.
  gloss:{roughness:.22,metalness:.1,clearcoat:1,clearcoatRoughness:.02},
  matte:{roughness:.78,metalness:.02,clearcoat:0,clearcoatRoughness:1},
  // Metallic flake under a satin coat: a soft but bright sheen along the tubes.
  "satin-metallic":{roughness:.36,metalness:.8,clearcoat:.4,clearcoatRoughness:.3},
};
// Painted frame surfaces take the colorway's finish; everything else keeps its own.
export function usePaintFinish(color:string) {
  const colorway=useContext(ColorwayContext);
  return color===framePaint?finishes[colorway.finish]:null;
}

// Environment highlights must not brighten de-emphasized context geometry.
export function FadedMaterial() {
  const color=useContext(ColorwayContext).faded;
  return <meshBasicMaterial color={color} transparent opacity={.12} depthWrite={false} toneMapped={false}/>;
}
