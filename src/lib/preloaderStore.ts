import { useSyncExternalStore } from "react";

// Whether the full-screen preloader has been dismissed for this page load.
//
// The preloader lives in __root and the hero logo lives on the home page, so
// they share no props. The hero logo sits on top of the preloader while it
// runs and only starts gliding to the hero once this flips — that handoff is
// what makes it read as the same logo continuing rather than a second one.

let done = false;
const listeners = new Set<() => void>();

export function markPreloaderDone(): void {
  if (done) return;
  done = true;
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function usePreloaderDone(): boolean {
  return useSyncExternalStore(subscribe, () => done, () => false);
}
