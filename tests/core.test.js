import { test } from "node:test";
import assert from "node:assert/strict";
import { amount, quantity, total, paid, fresh, validate } from "../core.js";
test("money stays in integer cents, bundled lines and extra added once", () => {
  const j = {
    lines: [
      {
        cents: 500,
        quantity: 2,
        extraCents: 300,
        details: "Shorten and take in waist",
      },
      { cents: 500, quantity: 1, extraCents: 0 },
    ],
    payments: [{ cents: 500 }, { cents: 400 }],
  };
  assert.equal(total(j), 1800);
  assert.equal(paid(j), 900);
  assert.equal(amount("0.29"), 29);
  assert.equal(amount("12.3"), 1230);
});
test("reject invalid quantities and amounts", () => {
  for (const v of ["-1", "1.001", "NaN", "Infinity", "", "1e2"])
    assert.throws(() => amount(v));
  for (const v of ["0", "-1", "1.5", "", "Infinity"])
    assert.throws(() => quantity(v));
});
test("backup validates and protects against malformed content", () => {
  assert.deepEqual(validate(JSON.parse(JSON.stringify(fresh()))), fresh());
  for (const x of [
    null,
    {},
    {
      version: 1,
      customers: [],
      jobs: [],
      services: [{ id: "x", name: "Bad", cents: -1 }],
    },
  ])
    assert.throws(() => validate(x));
});
