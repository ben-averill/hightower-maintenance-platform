import { useEffect,useLayoutEffect,useState } from "react";
import { colorways,defaultColorway,isColorway,type ColorwayId } from "./colorways";
const key="hightower-theme";
export function useTheme() {
  // Earlier builds stored light/dark/system; anything unrecognised falls back to Moss.
  const [colorway,setColorway]=useState<ColorwayId>(()=>{
    try {const value=localStorage.getItem(key);return isColorway(value)?value:defaultColorway;} catch {return defaultColorway;}
  });
  useLayoutEffect(()=>{
    document.documentElement.dataset.theme=colorway;
    const meta=document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if(meta) meta.content=colorways[colorway].canvas;
  },[colorway]);
  useEffect(()=>{try {localStorage.setItem(key,colorway);} catch { /* A blocked store still permits session theme changes. */ }},[colorway]);
  return {colorway,setColorway};
}
