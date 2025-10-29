export default function getRatingTypeFromTimeControl(tc) {
  const minutes = parseInt(tc.split("+")[0]);
  if (minutes <= 1) return "bullet";  // 1 min or less
  if (minutes <= 10) return "blitz";  // 2–10 min
  if (minutes <= 60) return "rapid";  // 11–60 min
  return "daily";                     // >60 min
}
