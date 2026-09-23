import assert from "node:assert/strict";
import { getAccessStatus, requireAccess, sessionCookie, verifyPassword } from "../lib/access-control";

const original = {
  hosted: process.env.LOCKINOLA_HOSTED,
  password: process.env.LOCKINOLA_ACCESS_PASSWORD,
  secret: process.env.LOCKINOLA_ACCESS_SECRET,
};

try {
  process.env.LOCKINOLA_HOSTED = "false";
  let status = await getAccessStatus(new Request("http://localhost/api/access"));
  assert.equal(status.mode, "local");
  assert.equal(status.authenticated, true, "local development should remain frictionless");

  process.env.LOCKINOLA_HOSTED = "true";
  delete process.env.LOCKINOLA_ACCESS_PASSWORD;
  delete process.env.LOCKINOLA_ACCESS_SECRET;
  status = await getAccessStatus(new Request("https://study.example/api/access"));
  assert.equal(status.authenticated, false, "hosted mode must fail closed when secrets are missing");
  assert.equal(status.accessConfigured, false);

  process.env.LOCKINOLA_ACCESS_PASSWORD = "a-long-private-password";
  process.env.LOCKINOLA_ACCESS_SECRET = "0123456789abcdef0123456789abcdef0123456789abcdef";
  assert.equal(await verifyPassword("wrong-password"), false);
  assert.equal(await verifyPassword("a-long-private-password"), true);
  const cookie = (await sessionCookie()).split(";", 1)[0];
  const allowed = new Request("https://study.example/api/python/run", { headers: { cookie } });
  assert.equal(await requireAccess(allowed), null, "signed session should unlock protected APIs");
  const denied = await requireAccess(new Request("https://study.example/api/python/run"));
  assert.equal(denied?.status, 401, "missing session must be denied in hosted mode");
  console.log("Stage 10 access verification passed.");
} finally {
  if (original.hosted === undefined) delete process.env.LOCKINOLA_HOSTED; else process.env.LOCKINOLA_HOSTED = original.hosted;
  if (original.password === undefined) delete process.env.LOCKINOLA_ACCESS_PASSWORD; else process.env.LOCKINOLA_ACCESS_PASSWORD = original.password;
  if (original.secret === undefined) delete process.env.LOCKINOLA_ACCESS_SECRET; else process.env.LOCKINOLA_ACCESS_SECRET = original.secret;
}
