/**
 * FINDORA AI – Full AI Engine Diagnostic Test
 * Tests: Gemini API, Matching Engine, NLP, Fraud Detection
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const { generateContent, parseSearchWithGemini } = require('../services/gemini');
const { rankCandidates, computeTextSimilarity, computeVisualSimilarity, computeLocationScore, computeTimeScore } = require('../services/matching');
const { analyzeClaimantRisk } = require('../services/fraud');

const PASS = '✅ PASS';
const FAIL = '❌ FAIL';
const WARN = '⚠️  WARN';

let passed = 0, failed = 0, warned = 0;

function result(label, ok, info = '') {
  if (ok === true)  { console.log(`  ${PASS}  ${label}${info ? ' — ' + info : ''}`); passed++; }
  else if (ok === false) { console.log(`  ${FAIL}  ${label}${info ? ' — ' + info : ''}`); failed++; }
  else              { console.log(`  ${WARN}  ${label}${info ? ' — ' + info : ''}`); warned++; }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. MATCHING ENGINE (no network, pure logic)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n═══════════════════════════════════════════');
console.log('  TEST 1: Multimodal Matching Engine');
console.log('═══════════════════════════════════════════');

const lostLaptop = {
  id: 'test_lost_1', type: 'LOST',
  title: 'Blue Dell Laptop', description: 'Dell Inspiron 15 3000 blue lid crack corner sticker',
  category: 'Electronics', color: 'Blue', brand: 'Dell', model: 'Inspiron 15',
  building: 'Block A', floor: 2,
  event_time: new Date(Date.now() - 5 * 86400000).toISOString(),
};

const foundLaptop = {
  id: 'test_found_1', type: 'FOUND',
  title: 'Dell Laptop Blue Found', description: 'Found Dell laptop blue colour cracked lid near lab Block A',
  category: 'Electronics', color: 'Blue', brand: 'Dell', model: 'Inspiron 15',
  building: 'Block A', floor: 2,
  event_time: new Date(Date.now() - 4 * 86400000).toISOString(),
};

const foundUnrelated = {
  id: 'test_found_2', type: 'FOUND',
  title: 'Red Bag Found', description: 'Red backpack found near canteen',
  category: 'Bags', color: 'Red', brand: null, model: null,
  building: 'Canteen Block', floor: 1,
  event_time: new Date(Date.now() - 4 * 86400000).toISOString(),
};

const foundIdCard = {
  id: 'test_found_3', type: 'FOUND',
  title: 'Student ID Card Found', description: 'VSB college student ID found near canteen counter',
  category: 'Documents', color: 'Maroon', brand: null, model: null,
  building: 'Canteen Block', floor: 1,
  event_time: new Date(Date.now() - 1 * 86400000).toISOString(),
};

const lostId = {
  id: 'test_lost_2', type: 'LOST',
  title: 'College ID Card Lost', description: 'VSB Engineering College ID maroon card lost canteen',
  category: 'Documents', color: 'Maroon', brand: null, model: null,
  building: 'Canteen Block', floor: 1,
  event_time: new Date(Date.now() - 2 * 86400000).toISOString(),
};

// Test text similarity
const textSim = computeTextSimilarity(
  'blue dell laptop inspiron cracked sticker',
  'dell laptop blue cracked lid sticker found'
);
result('Text similarity (same item, different phrasing)', textSim >= 0.5, `score=${textSim.toFixed(3)}`);

const textSimLow = computeTextSimilarity('blue laptop', 'red bag canteen');
result('Text similarity (unrelated items is low)', textSimLow < 0.4, `score=${textSimLow.toFixed(3)}`);

// Test visual similarity
const visualHigh = computeVisualSimilarity(lostLaptop, foundLaptop);
result('Visual similarity (same brand/color/model)', visualHigh >= 0.7, `score=${visualHigh.toFixed(3)}`);

const visualLow = computeVisualSimilarity(lostLaptop, foundUnrelated);
result('Visual similarity (completely different)', visualLow < 0.4, `score=${visualLow.toFixed(3)}`);

// Test location score
const locSame = computeLocationScore(lostLaptop, foundLaptop);
result('Location score (same building/floor)', locSame >= 0.85, `score=${locSame.toFixed(3)}`);

const locFar = computeLocationScore(lostLaptop, foundUnrelated);
result('Location score (different buildings)', locFar <= locSame, `score=${locFar.toFixed(3)}`);

// Test time score
const timeSim = computeTimeScore(lostLaptop, foundLaptop);
result('Time score (found 1 day after lost)', timeSim >= 0.65, `score=${timeSim.toFixed(3)}`);

// Test full ranking
const rankedLaptop = rankCandidates(lostLaptop, [foundLaptop, foundUnrelated, foundIdCard]);
result('rankCandidates returns results', rankedLaptop.length > 0, `found ${rankedLaptop.length} matches`);
result('Top match is the correct laptop (not bag/ID)', rankedLaptop[0]?.found_item_id === 'test_found_1', 
  `top: ${rankedLaptop[0]?.found_item_id}, score=${rankedLaptop[0]?.final_score}`);
// Stage 1 correctly filters unrelated categories — bag should NOT appear in results
const bagInResults = rankedLaptop.find(m => m.found_item_id === 'test_found_2');
result('Hard negative: unrelated category filtered (Stage 1)', bagInResults === undefined,
  bagInResults ? `bag not filtered, score=${bagInResults.final_score}` : 'bag correctly excluded by category filter');

const rankedId = rankCandidates(lostId, [foundIdCard, foundLaptop]);
result('ID card matches ID card (not laptop)', rankedId[0]?.found_item_id === 'test_found_3',
  `top: ${rankedId[0]?.found_item_id}, score=${rankedId[0]?.final_score}`);

result('Confidence level assigned correctly', ['HIGH','MEDIUM','LOW'].includes(rankedLaptop[0]?.confidence_level),
  `level=${rankedLaptop[0]?.confidence_level}`);

result('Explanation generated', Boolean(rankedLaptop[0]?.explanation?.why), 'explanation.why present');

// ─────────────────────────────────────────────────────────────────────────────
// 2. FRAUD DETECTION ENGINE
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n═══════════════════════════════════════════');
console.log('  TEST 2: Fraud Detection Engine');
console.log('═══════════════════════════════════════════');

try {
  const fraudResult = analyzeClaimantRisk('usr_test', { verification_score: 0.75 }, []);
  result('Fraud analysis returns risk_score', typeof fraudResult.risk_score === 'number', `risk=${fraudResult.risk_score}`);
  result('Fraud analysis returns risk_level', ['LOW','MEDIUM','HIGH','CRITICAL'].includes(fraudResult.risk_level), `level=${fraudResult.risk_level}`);
  result('Fraud analysis returns risk_factors', Array.isArray(fraudResult.risk_factors), `${fraudResult.risk_factors?.length} factors`);
  result('Fraud: clean user = LOW risk', fraudResult.risk_level === 'LOW', `level=${fraudResult.risk_level}`);

  // High-risk user test
  const spamHistory = Array(4).fill({ status:'REJECTED', created_at: new Date().toISOString(), category:'Electronics' });
  const highRisk = analyzeClaimantRisk('usr_spammer', { verification_score: 0.2 }, spamHistory);
  result('Fraud: spammer with rejections = elevated risk', highRisk.risk_score > 35, `risk=${highRisk.risk_score}, level=${highRisk.risk_level}`);
} catch (e) {
  result('Fraud detection engine', false, e.message);
}


// ─────────────────────────────────────────────────────────────────────────────
// 3. GEMINI AI API
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n═══════════════════════════════════════════');
console.log('  TEST 3: Google Gemini AI API');
console.log('═══════════════════════════════════════════');

(async () => {
  // 3a. Direct content generation
  try {
    const response = await generateContent('Reply with only the word FINDORA in uppercase. Nothing else.');
    const ok = typeof response === 'string' && response.toUpperCase().includes('FINDORA');
    result('Gemini generateContent()', ok, `response="${response?.substring(0,50)}"`);
  } catch (e) {
    result('Gemini generateContent()', false, e.message);
  }

  // 3b. NLP search parsing
  try {
    const parsed = await parseSearchWithGemini('I lost my blue Dell laptop near the library yesterday');
    result('Gemini NLP parseSearchWithGemini()', Boolean(parsed), `parsed=${JSON.stringify(parsed)?.substring(0,80)}`);
    result('NLP extracts category', parsed?.category !== undefined, `category="${parsed?.category}"`);
    result('NLP extracts color', parsed?.color !== undefined, `color="${parsed?.color}"`);
    result('NLP extracts keywords array', Array.isArray(parsed?.keywords), `keywords=${JSON.stringify(parsed?.keywords)}`);
  } catch (e) {
    result('Gemini NLP parseSearchWithGemini()', false, e.message);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SUMMARY
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n╔═══════════════════════════════════════════╗');
  console.log('║          AI ENGINE TEST SUMMARY           ║');
  console.log('╠═══════════════════════════════════════════╣');
  console.log(`║  ✅ PASSED : ${String(passed).padEnd(28)}║`);
  console.log(`║  ❌ FAILED : ${String(failed).padEnd(28)}║`);
  console.log(`║  ⚠️  WARNED : ${String(warned).padEnd(27)}║`);
  console.log('╚═══════════════════════════════════════════╝');
  if (failed === 0) {
    console.log('\n🚀 ALL AI ENGINES OPERATIONAL!\n');
  } else {
    console.log(`\n⚠️  ${failed} test(s) failed — check above for details.\n`);
  }
})();
