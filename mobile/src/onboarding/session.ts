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
