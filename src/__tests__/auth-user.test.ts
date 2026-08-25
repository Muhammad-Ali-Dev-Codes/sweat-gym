import { describe, it, expect } from "vitest";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getAuthUser, getVerifiedUser } from "@/lib/supabase/auth-user";

const fakeUser = { id: "u1", email: "t@example.com" } as unknown as User;

function makeClient(overrides: {
  session?: unknown | null;
  getUser?: () => Promise<unknown>;
}): SupabaseClient {
  return {
    auth: {
      getSession: async () => ({ data: { session: overrides.session ?? null } }),
      getUser: overrides.getUser ?? (async () => ({ data: { user: null }, error: null })),
    },
  } as unknown as SupabaseClient;
}

describe("getAuthUser", () => {
  it("returns null when there is no local session", async () => {
    const client = makeClient({ session: null });
    expect(await getAuthUser(client)).toBeNull();
  });

  it("uses the validated user when online check succeeds", async () => {
    const client = makeClient({
      session: { user: fakeUser },
      getUser: async () => ({ data: { user: fakeUser }, error: null }),
    });
    expect(await getAuthUser(client)).toBe(fakeUser);
  });

  it("falls back to the session user when the auth server is unreachable", async () => {
    const client = makeClient({
      session: { user: fakeUser },
      getUser: async () => {
        throw new TypeError("fetch failed");
      },
    });
    expect(await getAuthUser(client)).toBe(fakeUser);
  });

  it("does not hang when the auth server blackholes (timeout fallback)", async () => {
    const client = makeClient({
      session: { user: fakeUser },
      getUser: () => new Promise(() => {}), // never resolves
    });
    expect(await getAuthUser(client, 20)).toBe(fakeUser);
  });

  it("logs out on a definitive rejection by the auth server", async () => {
    const client = makeClient({
      session: { user: fakeUser },
      getUser: async () => ({
        data: { user: null },
        error: { message: "invalid claim", status: 401 },
      }),
    });
    expect(await getAuthUser(client)).toBeNull();
  });

  it("stays signed in on 5xx responses from the auth server", async () => {
    const client = makeClient({
      session: { user: fakeUser },
      getUser: async () => ({
        data: { user: null },
        error: { message: "server error", status: 503 },
      }),
    });
    expect(await getAuthUser(client)).toBe(fakeUser);
  });

  it("rejects the offline fallback when the session token is expired", async () => {
    const client = makeClient({
      // expires_at one hour in the past (unix seconds).
      session: { user: fakeUser, expires_at: Math.floor(Date.now() / 1000) - 3600 },
      getUser: () => new Promise(() => {}), // network blackhole
    });
    expect(await getAuthUser(client, 20)).toBeNull();
  });

  it("keeps the offline fallback while the session token is still fresh", async () => {
    const client = makeClient({
      session: {
        user: fakeUser,
        expires_at: Math.floor(Date.now() / 1000) + 1800, // 30 min from now
      },
      getUser: () => new Promise(() => {}),
    });
    expect(await getAuthUser(client, 20)).toBe(fakeUser);
  });
});

describe("getVerifiedUser", () => {
  it("returns the user when verification succeeds", async () => {
    const client = makeClient({
      getUser: async () => ({ data: { user: fakeUser }, error: null }),
    });
    expect(await getVerifiedUser(client)).toBe(fakeUser);
  });

  it("fails closed on a definitive rejection", async () => {
    const client = makeClient({
      getUser: async () => ({
        data: { user: null },
        error: { message: "invalid claim", status: 401 },
      }),
    });
    expect(await getVerifiedUser(client)).toBeNull();
  });

  it("fails closed when the auth server is unreachable", async () => {
    const client = makeClient({
      getUser: async () => {
        throw new TypeError("fetch failed");
      },
    });
    expect(await getVerifiedUser(client)).toBeNull();
  });

  it("fails closed instead of hanging on a blackholed auth server", async () => {
    const client = makeClient({
      getUser: () => new Promise(() => {}), // never resolves
    });
    expect(await getVerifiedUser(client, 20)).toBeNull();
  });
});
