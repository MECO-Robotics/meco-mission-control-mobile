import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const appSource = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
const screenTypesSource = readFileSync(new URL("../src/screens/types.ts", import.meta.url), "utf8");
const manufacturingSource = readFileSync(new URL("../src/screens/ManufacturingScreen.tsx", import.meta.url), "utf8");

test("App derives mentor approval permission from trusted mentor and admin roles", () => {
  const signedInMemberBlock = appSource.match(
    /const signedInMember\s*=\s*useMemo\([\s\S]*?\n  \}, \[members, sessionMember\]\);/,
  )?.[0];
  assert.ok(signedInMemberBlock);
  assert.doesNotMatch(signedInMemberBlock, /selectedMemberId/);
  assert.doesNotMatch(signedInMemberBlock, /activePersonFilter/);
  assert.match(appSource, /const canUseSignedInMemberRoleFallback\s*=\s*[\s\S]*sessionMember !== null[\s\S]*signedInMember\?\.id === sessionMember\.id/);
  assert.match(appSource, /canUseSignedInMemberRoleFallback &&\s*\(\s*signedInMember\?\.role === "mentor" \|\| signedInMember\?\.role === "admin"\s*\)/);
  assert.match(appSource, /const canMentorApprove\s*=\s*[\s\S]*sessionUser\?\.role === "mentor"/);
  assert.match(appSource, /const canMentorApprove\s*=\s*[\s\S]*sessionUser\?\.role === "admin"/);
  assert.doesNotMatch(appSource, /const canMentorApprove\s*=[^;]*role === "lead"/);
});

test("App exposes mentor approval permission through shared screen props", () => {
  assert.match(screenTypesSource, /canMentorApprove:\s*boolean;/);
  assert.match(appSource, /canMentorApprove,\s*\n/);
});

test("manufacturing mentor review actions are guarded by the role permission", () => {
  assert.match(manufacturingSource, /canMentorApprove/);
  assert.match(manufacturingSource, /const canApproveItem\s*=\s*canMentorApprove && !item\.mentorReviewed;/);
  assert.match(manufacturingSource, /\{canApproveItem \? \(/);
});

test("QA report drafts preserve automatic mentor approval from the role permission", () => {
  assert.match(appSource, /mentorApproved:\s*Boolean\(canMentorApprove\)/);
});
