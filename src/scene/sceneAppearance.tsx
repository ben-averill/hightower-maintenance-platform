import { createContext,useContext } from "react";

export const scenePalette={
  light:{background:"#e9ede4",faded:"#b8c2b6"},
  dark:{background:"#151c22",faded:"#39454e"},
} as const;
export const FadeColorContext=createContext<string>(scenePalette.light.faded);

// Environment highlights must not brighten de-emphasized context geometry.
export function FadedMaterial() {
  const color=useContext(FadeColorContext);
  return <meshBasicMaterial color={color} transparent opacity={.12} depthWrite={false} toneMapped={false}/>;
}
