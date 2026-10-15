/**
 * A signed-in visitor's view history. Accounts arrive in phase 13, so recording a view does
 * nothing yet; pages already call this one function so only its body has to change then.
 */
export type ViewTarget = { placeId?: number; districtId?: number };

export function recordView(target: ViewTarget): void {
  void target;
}
