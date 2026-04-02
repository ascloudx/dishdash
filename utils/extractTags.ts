/**
 * Maps structured booking tags to compact display labels.
 */
export function extractTags(tags: string[]): string[] {
  return tags.flatMap((tag) => {
    switch (tag) {
      case "time:evening":
        return ["Evening"];
      case "style:nude":
        return ["Nude"];
      case "style:chrome":
        return ["Chrome"];
      case "birthday":
      case "occasion:birthday":
        return ["Birthday"];
      case "vip":
      case "occasion:wedding":
        return ["Wedding"];
      default:
        return [];
    }
  });
}
