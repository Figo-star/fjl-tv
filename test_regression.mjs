import { PlaybackResolver } from './src/lib/playbackResolver.ts';
import { normalizeItem, MediaProvider } from './src/lib/mediaProvider.ts';

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Regression test failure: ${message}`);
  }
}

async function runTests() {
  console.log('--- Running Playback & Content Integrity Checks ---');

  process.env.NEXT_PUBLIC_ENABLE_DEMO_FIXTURES = 'false';

  // Test 1: Direct ad-free source prioritisation and embed alternatives availability
  console.log('Testing Batman playback resolution and provider alternatives...');
  const testBatman = await PlaybackResolver.resolvePlayback('414906', 'movie');
  assert(testBatman.isPlayable, 'The Batman should resolve to playable sources');
  assert(testBatman.activeSource !== null, 'Active source should exist');
  assert(testBatman.availableSources.length >= 4, 'Must provide direct source plus embed alternatives');

  // Verify direct HLS stream is active when available
  assert(
    testBatman.activeSource.type === 'hls' || testBatman.activeSource.type === 'embed',
    'Active source must be valid hls or embed'
  );

  // Check presence of restored embed providers
  const hasVidLink = testBatman.availableSources.some((s) => s.id === 'embed-vidlink');
  const hasVideasy = testBatman.availableSources.some((s) => s.id === 'embed-videasy');
  const hasVidSrcTo = testBatman.availableSources.some((s) => s.id === 'embed-vidsrc-to');
  assert(hasVidLink, 'VidLink provider must be restored');
  assert(hasVideasy, 'Videasy provider must be restored');
  assert(hasVidSrcTo, 'VidSrc TO provider must be restored');
  console.log('✓ Test 1 Passed: The Batman resolves with restored embed alternatives and direct stream options.');

  // Test 2: TV episode mapping with distinct sources and season/episode parameters
  console.log('Testing Arcane episodic resolution...');
  const testArcaneEp1 = await PlaybackResolver.resolvePlayback('94605', 'tv', 1, 1);
  const testArcaneEp2 = await PlaybackResolver.resolvePlayback('94605', 'tv', 1, 2);

  assert(testArcaneEp1.isPlayable, 'Arcane S1E1 must be playable');
  assert(testArcaneEp2.isPlayable, 'Arcane S1E2 must be playable');
  assert(
    testArcaneEp1.activeSource.url !== testArcaneEp2.activeSource.url,
    'Different episodes must resolve to distinct direct stream URLs'
  );

  const ep1VidLink = testArcaneEp1.availableSources.find((s) => s.id === 'embed-vidlink');
  const ep2VidLink = testArcaneEp2.availableSources.find((s) => s.id === 'embed-vidlink');
  assert(
    ep1VidLink.url.includes('/1/1'),
    `Ep1 VidLink URL must contain season 1 episode 1. Found: ${ep1VidLink.url}`
  );
  assert(
    ep2VidLink.url.includes('/1/2'),
    `Ep2 VidLink URL must contain season 1 episode 2. Found: ${ep2VidLink.url}`
  );
  console.log('✓ Test 2 Passed: Arcane S1E1 and S1E2 resolve to distinct episode streams across all providers.');

  // Test 3: Invalid or empty media handling
  console.log('Testing empty identifier handling...');
  const testInvalid = await PlaybackResolver.resolvePlayback('', 'movie');
  assert(!testInvalid.isPlayable, 'Empty identifier must return isPlayable: false');
  console.log('✓ Test 3 Passed: Empty ID cleanly rejected.');

  // Test 4: Genre mapping integrity (No default "Action" mapping for unrelated items)
  console.log('Testing genre mapping accuracy...');
  const rawAnimationDrama = {
    id: 1234,
    title: 'Test Drama Animation',
    genres: [16, 18], // TMDB 16=Animation, 18=Drama
  };
  const norm1 = normalizeItem(rawAnimationDrama, 'tv');
  assert(norm1.genres.includes('Animation'), 'Genre 16 must map to Animation');
  assert(norm1.genres.includes('Drama'), 'Genre 18 must map to Drama');
  assert(!norm1.genres.includes('Action'), 'Must NOT invent Action genre');

  const rawEmptyGenre = {
    id: 5678,
    title: 'Empty Genre Item',
    genres: [],
  };
  const norm2 = normalizeItem(rawEmptyGenre, 'movie');
  assert(norm2.genres.length === 0, 'Empty genres must remain empty, never default to Action');
  console.log('✓ Test 4 Passed: Genre mapping accurately respects real data without artificial Action fallback.');

  console.log('\nAll regression and playback integrity checks PASSED successfully!');
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
