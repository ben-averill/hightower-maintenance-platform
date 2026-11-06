import { useEffect,useLayoutEffect,useState } from "react";
export type ThemePreference="system"|"light"|"dark";
export type ResolvedTheme="light"|"dark";
const key="hightower-theme";
export function useTheme() {
  const [preference,setPreference]=useState<ThemePreference>(()=>{
    try {const value=localStorage.getItem(key);return value==="light"||value==="dark"?value:"system";} catch {return "system";}
  });
  const [systemDark,setSystemDark]=useState(()=>window.matchMedia("(prefers-color-scheme: dark)").matches);
  useEffect(()=>{
    const query=window.matchMedia("(prefers-color-scheme: dark)");
    const update=()=>setSystemDark(query.matches);update();query.addEventListener("change",update);
    return ()=>query.removeEventListener("change",update);
  },[]);
  const theme:ResolvedTheme=preference==="system"?(systemDark?"dark":"light"):preference;
  useLayoutEffect(()=>{
    document.documentElement.dataset.theme=theme;
    const meta=document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if(meta) meta.content=theme==="dark"?"#151c22":"#e9ede4";
  },[theme]);
  useEffect(()=>{try {localStorage.setItem(key,preference);} catch { /* A blocked store still permits session theme changes. */ }},[preference]);
  return {preference,setPreference,theme};
}
