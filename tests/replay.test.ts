import assert from "node:assert/strict";
import test from "node:test";
import {
  initialClock,
  pauseClock,
  playClock,
  REPLAY_DURATION_MS,
  settleClock,
} from "../src/lib/replay/clock";

const duration = REPLAY_DURATION_MS;

test("pause freezes time and resume excludes time spent paused", () => {
  const playing = playClock(initialClock(), 1000);
  const paused = pauseClock(playing, 2500, duration);
  assert.equal(paused.elapsedMs, 1500);
  assert.equal(paused.status, "paused");
  assert.deepEqual(settleClock(paused, 99_000, duration), paused);
  assert.equal(
    settleClock(playClock(paused, 100_000), 101_000, duration).elapsedMs,
    2500,
  );
});

test("a round ends after exactly one minute of running time", () => {
  const playing = playClock(initialClock(), 0);
  const beforeDeadline = settleClock(playing, 59_999, duration);
  assert.equal(beforeDeadline.status, "playing");
  const finished = settleClock(beforeDeadline, 60_000, duration);
  assert.equal(finished.status, "finished");
  assert.equal(finished.elapsedMs, 60_000);
});

test("repeated frames do not change the clock's result", () => {
  const playing = playClock(initialClock(), 0);
  let stepped = playing;
  for (let now = 10; now <= 1000; now += 10)
    stepped = settleClock(stepped, now, duration);
  assert.equal(
    stepped.elapsedMs,
    settleClock(playing, 1000, duration).elapsedMs,
  );
});

test("completion clamps exactly and prevents accidental restart without reset", () => {
  const finished = settleClock(
    playClock(initialClock(), 0),
    duration + 500,
    duration,
  );
  assert.equal(finished.status, "finished");
  assert.equal(finished.elapsedMs, duration);
  assert.deepEqual(playClock(finished, duration + 1000), finished);
  assert.equal(initialClock().elapsedMs, 0);
});
