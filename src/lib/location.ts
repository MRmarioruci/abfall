// Split a free-text location ("8001 Zürich, ZH", "Munich, Bavaria") into
// the structured fields publishing, community search and the map read
// first. Returns null for an empty string.
export function placeFromLocation(
  location: string,
): { municipality: string; canton?: string } | null {
  const [cityPart = "", regionPart = ""] = location.split(",").map((s) => s.trim());
  const municipality = cityPart.replace(/^\d{4,5}\s+/, "");
  if (!municipality) return null;
  return { municipality, canton: regionPart || undefined };
}
