import assert from "node:assert/strict";
import test from "node:test";
import { handleMiddleware } from "./middleware";

type TestUser = { email: string | null } | null;

const createRequest = (url: string) =>
  ({
    url,
    nextUrl: new URL(url),
    cookies: {
      getAll: () => [],
      set: () => {},
    },
  }) as never;

const createResponse = (
  body: BodyInit | null,
  init?: ResponseInit,
) => {
  const response = new Response(body, init) as Response & {
    cookies: { set: (name: string, value: string, options?: unknown) => void };
  };
  Object.defineProperty(response, "cookies", {
    value: {
      set: () => {},
    },
  });
  return response as never;
};

const createDependencies = (user: TestUser, isAdmin = false) => ({
  createServerClient: (() =>
    ({
      auth: {
        getUser: async () => ({
          data: { user },
        }),
      },
    })) as never,
  getSupabaseUrl: (() => "https://example.supabase.co") as never,
  getSupabaseAnonKey: (() => "anon-key") as never,
  isAdminEmail: ((email: string | null | undefined) => isAdmin && email === user?.email) as never,
  next: (() => createResponse(null, { status: 200 })) as never,
  redirect: ((url: URL) =>
    createResponse(null, {
      status: 307,
      headers: { location: url.toString() },
    })) as never,
  json: ((body: unknown, init: { status: number }) =>
    createResponse(JSON.stringify(body), {
      status: init.status,
      headers: { "content-type": "application/json" },
    })) as never,
});

test("middleware 会将未登录用户重定向到登录页并保留原始路径", async () => {
  const response = await handleMiddleware(
    createRequest("http://localhost/today?tab=review"),
    createDependencies(null),
  );

  assert.equal(response.status, 307);
  assert.equal(
    response.headers.get("location"),
    "http://localhost/login?redirect=%2Ftoday%3Ftab%3Dreview",
  );
});

test("middleware 会将已登录用户从登录页安全重定向回站内路径", async () => {
  const response = await handleMiddleware(
    createRequest("http://localhost/login?redirect=%2Freview"),
    createDependencies({ email: "user@example.com" }),
  );

  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "http://localhost/review");
});

test("middleware 会拦截危险的协议相对 redirect 参数", async () => {
  const response = await handleMiddleware(
    createRequest("http://localhost/login?redirect=%2F%2Fevil.com"),
    createDependencies({ email: "user@example.com" }),
  );

  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "http://localhost/scenes");
});

test("middleware 会阻止非管理员访问 /admin", async () => {
  const response = await handleMiddleware(
    createRequest("http://localhost/admin"),
    createDependencies({ email: "user@example.com" }),
  );

  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "http://localhost/");
});

test("middleware 会对未登录的受保护 learning API 返回 401", async () => {
  const response = await handleMiddleware(
    createRequest("http://localhost/api/learning/continue"),
    createDependencies(null),
  );

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "Unauthorized" });
});

test("middleware 会对未登录的高成本 explain-selection 返回 401", async () => {
  const response = await handleMiddleware(
    createRequest("http://localhost/api/explain-selection"),
    createDependencies(null),
  );

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "Unauthorized" });
});
