// 2026-11-28 rev.1 — 특강 신청서를 D1(applicants 표)에 저장하는 파일
// 위치: 프로젝트 폴더의 functions/api/apply.js  →  주소: /api/apply
// 필요: Cloudflare Pages 설정에서 D1 데이터베이스를 변수 이름 DB 로 연결 (비밀번호·키는 필요 없음)

const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };

function reply(body, status) {
  return new Response(JSON.stringify(body), { status: status, headers: JSON_HEADERS });
}

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

// 신청서 저장 (POST /api/apply)
export async function onRequestPost(context) {
  const { request, env } = context;

  let data;
  try {
    data = await request.json();
  } catch (e) {
    return reply({ ok: false, error: "bad_request" }, 400);
  }

  const name = clean(data.name);
  const phone = clean(data.phone);
  const email = clean(data.email);
  const organization = clean(data.organization);
  const position = clean(data.position);

  // 필수 3개: 이름, 연락처, 이메일
  if (!name || !phone || !email) {
    return reply({ ok: false, error: "required" }, 400);
  }
  // 너무 긴 값 막기
  if ([name, phone, email, organization, position].some(function (v) { return v.length > 100; })) {
    return reply({ ok: false, error: "too_long" }, 400);
  }
  // 이메일 모양 확인
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return reply({ ok: false, error: "bad_email" }, 400);
  }

  // D1 연결이 안 되어 있으면 안내
  if (!env.DB) {
    return reply({ ok: false, error: "no_db" }, 500);
  }

  try {
    // 신청 번호(id)와 신청 시간(created_at)은 표에서 자동으로 채워짐
    await env.DB
      .prepare("INSERT INTO applicants (name, organization, position, phone, email) VALUES (?1, ?2, ?3, ?4, ?5)")
      .bind(name, organization || null, position || null, phone, email)
      .run();
    return reply({ ok: true }, 201);
  } catch (e) {
    // 같은 이메일로 이미 신청한 경우
    if (String((e && e.message) || e).indexOf("UNIQUE constraint failed") !== -1) {
      return reply({ ok: false, error: "duplicate" }, 409);
    }
    return reply({ ok: false, error: "server" }, 500);
  }
}

// POST 외의 요청은 막기
export async function onRequest() {
  return reply({ ok: false, error: "method_not_allowed" }, 405);
}
