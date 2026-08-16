import assert from "node:assert/strict";
import test from "node:test";

const ROLE_PERMS = {
  maker: ["stock_in", "sell", "returns"],
  checker: ["check", "sell", "payments"],
  accountant: [
    "stock_in",
    "sell",
    "check",
    "verify",
    "close_day",
    "gstr",
    "settings",
    "payments",
    "returns",
    "team",
    "backup",
  ],
};

function hasPermission(roles, perm) {
  return roles.some((r) => ROLE_PERMS[r]?.includes(perm));
}

test("maker can stock-in and sell, cannot verify or close day", () => {
  const r = ["maker"];
  assert.equal(hasPermission(r, "stock_in"), true);
  assert.equal(hasPermission(r, "sell"), true);
  assert.equal(hasPermission(r, "check"), false);
  assert.equal(hasPermission(r, "verify"), false);
  assert.equal(hasPermission(r, "close_day"), false);
  assert.equal(hasPermission(r, "gstr"), false);
});

test("checker can check and collect, cannot add stock", () => {
  const r = ["checker"];
  assert.equal(hasPermission(r, "check"), true);
  assert.equal(hasPermission(r, "payments"), true);
  assert.equal(hasPermission(r, "stock_in"), false);
  assert.equal(hasPermission(r, "verify"), false);
  assert.equal(hasPermission(r, "gstr"), false);
});

test("accountant has books jobs", () => {
  const r = ["accountant"];
  assert.equal(hasPermission(r, "verify"), true);
  assert.equal(hasPermission(r, "close_day"), true);
  assert.equal(hasPermission(r, "gstr"), true);
  assert.equal(hasPermission(r, "settings"), true);
});

test("guest with all three roles can do every job", () => {
  const r = ["maker", "checker", "accountant"];
  for (const perm of ROLE_PERMS.accountant) {
    assert.equal(hasPermission(r, perm), true, perm);
  }
});
