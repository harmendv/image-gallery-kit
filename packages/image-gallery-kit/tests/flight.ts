import { gsap } from 'gsap';

/*
 * A flight is a gsap tween, and gsap's clock is wall time: whatever a spec
 * samples after a real sleep is wherever a loaded machine happened to have got
 * to -- the start, the end, or the clone already gone. So specs hold the clock
 * instead. Paused, the root timeline still takes new tweens but never moves
 * them, which leaves the flight parked at its take-off until a spec seeks it to
 * the point it wants to look at, and releasing lets it run out as usual.
 */
export function holdFlights() {
  gsap.globalTimeline.pause();
}

export function releaseFlights() {
  gsap.globalTimeline.resume();
}

export function flyingClone() {
  return document.querySelector<HTMLElement>('[data-ig-flight="true"]');
}

export function flightLayer() {
  return document.querySelector<HTMLElement>('[data-ig-flight-layer="true"]');
}

/* eslint-disable no-await-in-loop -- polling waits for each check in turn; that is the point */
async function until<T>(check: () => T | null | undefined | false, what: string) {
  for (let attempt = 0; attempt < 400; attempt += 1) {
    const found = check();

    if (found) {
      return found;
    }

    await new Promise((resolve) => setTimeout(resolve, 5));
  }

  throw new Error(what);
}
/* eslint-enable no-await-in-loop */

/*
 * The clone appears only after paint waits whose timing the scheduler owns, so
 * a fixed sleep is a bet on machine load -- lost whenever the suite runs wide.
 * Polling for the clone itself waits exactly as long as the take-off takes.
 */
export function cloneInFlight() {
  return until(flyingClone, 'the flight never took off');
}

/*
 * Moves a held flight to `progress` (0..1) along its own ease, frame and
 * picture together, and renders it there before returning. The tweens are
 * created a tick after the clone is attached, so this waits for them first.
 */
export async function seekFlight(progress: number) {
  const clone = await cloneInFlight();
  const targets = [clone, clone.querySelector('img')].filter(Boolean);
  const tweens = await until(() => {
    const found = gsap.getTweensOf(targets);
    return found.length > 0 && found;
  }, 'the flight never started moving');

  tweens.forEach((tween) => tween.progress(progress));
  return clone;
}

/* Waits for the clone and its layer to be cleaned up, however long that takes. */
export function landed() {
  return until(() => !flyingClone() && !flightLayer(), 'the flight never landed');
}
