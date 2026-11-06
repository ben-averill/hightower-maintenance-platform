// Fade before the horizontal view so the grid never cuts across the bike
// during an underside inspection. Angles are relative to the camera target.
export function floorOpacity(elevation: number): number {
  const start = 8 * Math.PI / 180;
  const end = Math.PI / 180;
  const t = Math.max(0, Math.min(1, (elevation - end) / (start - end)));
  return t * t * (3 - 2 * t);
}
