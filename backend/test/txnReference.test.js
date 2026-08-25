// Unit test for the manual-transfer reference generator. No DB required.
const test = require('node:test');
const assert = require('node:assert');
const { generateTxnReference } = require('../controllers/paymentsController');

test('generateTxnReference is well-formed and unique', () => {
  const refs = new Set();
  for (let i = 0; i < 2000; i++) {
    const ref = generateTxnReference();
    // Format: SS-TRX-<10 hex upper chars>
    assert.match(ref, /^SS-TRX-[0-9A-F]{10}$/);
    refs.add(ref);
  }
  // All 2000 must be distinct (collision-proof for our purposes).
  assert.strictEqual(refs.size, 2000);
});
