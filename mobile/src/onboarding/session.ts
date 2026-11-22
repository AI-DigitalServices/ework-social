// Remembers, for this app session only, that the owner chose to set up later,
// so Home does not bounce them back into onboarding every time it opens.
let skipped = false;

export function markSkipped() {
  skipped = true;
}

export function wasSkipped(): boolean {
  return skipped;
}

export function resetSkipped() {
  skipped = false;
}

// Set when someone has just created an account in this app session, so Home waits for the setup check
// (and shows a loading screen) instead of flashing the dashboard before onboarding opens.
let fresh = false;

export function markFresh() {
  fresh = true;
}

export function isFresh(): boolean {
  return fresh;
}

export function clearFresh() {
  fresh = false;
}
