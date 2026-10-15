/**
 * Where an arrow key moves in a list of `count` items (wrapping), or null for other keys.
 * Right/Down = next, Left/Up = previous, Home/End = first/last.
 */
export function arrowTarget(key: string, index: number, count: number): number | null {
  switch (key) {
    case "ArrowRight":
    case "ArrowDown":
      return (index + 1) % count;
    case "ArrowLeft":
    case "ArrowUp":
      return (index - 1 + count) % count;
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return null;
  }
}
