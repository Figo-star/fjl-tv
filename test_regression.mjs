import { PlaybackResolver } from './src/lib/playbackResolver.ts';

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Regression test failure: ${message}`);
  }
}

console.log('--- Running Playback & Content Integrity Checks ---');

// Test 1: Production resolution never silently injects generic demo videos
process.env.NEXT_PUBLIC_ENABLE_DEMO_FIXTURES = 'false';

const testBatman = PlaybackResolver.resolvePlayback('414906', 'movie');
assert(testBatman.isPlayable, 'The Batman should be resolved');
assert(testBatman.activeSource !== null, 'Active source should exist');
assert(
  testBatman.activeSource.url.includes('414906') === true,
  `Batman stream source URL must contain content ID 414906. Found: ${testBatman.activeSource?.url}`
);
assert(
  testBatman.activeSource.isAuthorizedDemo !== true,
  'Production must not resolve to generic demo stream'
);
console.log('✓ Test 1 Passed: The Batman resolves to matching content stream, not generic demo.');

// Test 2: Episode identity mapping for TV series
const testArcaneEp1 = PlaybackResolver.resolvePlayback('94605', 'tv', 1, 1);
const testArcaneEp2 = PlaybackResolver.resolvePlayback('94605', 'tv', 1, 2);

assert(
  testArcaneEp1.activeSource.url.includes('94605/1/1') === true,
  `Arcane S1E1 stream URL must target 94605/1/1. Found: ${testArcaneEp1.activeSource?.url}`
);
assert(
  testArcaneEp2.activeSource.url.includes('94605/1/2') === true,
  `Arcane S1E2 stream URL must target 94605/1/2. Found: ${testArcaneEp2.activeSource?.url}`
);
assert(
  testArcaneEp1.activeSource.url !== testArcaneEp2.activeSource.url,
  'Different episodes must resolve to distinct stream URLs'
);
console.log('✓ Test 2 Passed: Arcane S1E1 and S1E2 resolve to distinct episode streams.');

// Test 3: Invalid or empty ID handling
const invalidRes = PlaybackResolver.resolvePlayback('', 'movie');
assert(!invalidRes.isPlayable, 'Empty media ID must not be playable');
assert(invalidRes.activeSource === null, 'Empty media ID must have null source');
assert(
  invalidRes.unavailabilityReason !== undefined,
  'Empty media ID must have an unavailability reason'
);
console.log('✓ Test 3 Passed: Invalid ID fails cleanly without fallback.');

console.log('All regression integrity checks PASSED successfully!');
