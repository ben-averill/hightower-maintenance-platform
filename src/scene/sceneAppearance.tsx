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
  gloss:{roughness:.3,metalness:.08,clearcoat:1,clearcoatRoughness:.05},
  matte:{roughness:.78,metalness:.02,clearcoat:0,clearcoatRoughness:1},
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
