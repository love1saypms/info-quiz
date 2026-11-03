import { test } from "node:test";
import assert from "node:assert/strict";
import { checkTeacherClaims } from "../src/lib/auth/teacher.ts";

const ALLOWED = "teacher@example.com";

test("허용된 교사 이메일 1개만 통과시킨다 (대소문자·앞뒤 공백 무시)", () => {
  assert.deepEqual(checkTeacherClaims({ email: "Teacher@Example.com", email_verified: true }, ` ${ALLOWED} `), {
    ok: true,
    email: ALLOWED,
  });
});

test("다른 Google 계정은 허용되지 않은 계정으로 막는다", () => {
  assert.deepEqual(checkTeacherClaims({ email: "student@example.com", email_verified: true }, ALLOWED), {
    ok: false,
    reason: "forbidden",
  });
});

test("확인되지 않은 이메일이나 이메일이 없는 로그인은 막는다", () => {
  assert.equal(checkTeacherClaims({ email: ALLOWED, email_verified: false }, ALLOWED).ok, false);
  assert.equal(checkTeacherClaims({ email: ALLOWED }, ALLOWED).ok, false);
  assert.equal(checkTeacherClaims({ email_verified: true }, ALLOWED).ok, false);
});

test("허용 이메일 설정이 비어 있으면 아무도 통과시키지 않는다", () => {
  assert.deepEqual(checkTeacherClaims({ email: ALLOWED, email_verified: true }, undefined), {
    ok: false,
    reason: "not-configured",
  });
  assert.equal(checkTeacherClaims({ email: "", email_verified: true }, "  ").ok, false);
});
