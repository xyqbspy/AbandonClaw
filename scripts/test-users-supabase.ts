import { User } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  EnsureAuthUserInput,
  TestAuthUser,
  TestUserDataAccess,
  UpsertProfileInput,
} from "./test-users-lib";

const AUTH_LIST_USERS_PAGE_SIZE = 100;
const AUTH_LIST_USERS_MAX_PAGES = 20;

const toAuthUser = (user: User): TestAuthUser => ({
  id: user.id,
  email: user.email ?? null,
  emailConfirmedAt: user.email_confirmed_at ?? user.confirmed_at ?? null,
  userMetadata:
    user.user_metadata && typeof user.user_metadata === "object"
      ? (user.user_metadata as Record<string, unknown>)
      : undefined,
  appMetadata:
    user.app_metadata && typeof user.app_metadata === "object"
      ? (user.app_metadata as Record<string, unknown>)
      : undefined,
});

const authMetadata = (input: EnsureAuthUserInput) => ({
  ...({ username: input.username } satisfies Record<string, unknown>),
  is_test_user: true,
  test_user_kind: input.kind,
});

export const createSupabaseTestUserAccess = (): TestUserDataAccess => {
  const admin = createSupabaseAdminClient();

  return {
    async listAuthUsers() {
      const users: TestAuthUser[] = [];

      for (let page = 1; page <= AUTH_LIST_USERS_MAX_PAGES; page += 1) {
        const { data, error } = await admin.auth.admin.listUsers({
          page,
          perPage: AUTH_LIST_USERS_PAGE_SIZE,
        });

        if (error) {
          throw new Error(`Failed to list auth users: ${error.message}`);
        }

        const pageUsers = (data.users ?? []).map(toAuthUser);
        users.push(...pageUsers);

        if (pageUsers.length < AUTH_LIST_USERS_PAGE_SIZE) {
          break;
        }
      }

      return users;
    },

    async createAuthUser(input) {
      const { data, error } = await admin.auth.admin.createUser({
        email: input.email,
        password: input.password,
        email_confirm: input.emailConfirmed,
        user_metadata: authMetadata(input),
      });
      if (error || !data.user) {
        throw new Error(`Failed to create auth user: ${error?.message ?? "unknown error"}`);
      }
      return toAuthUser(data.user);
    },

    async updateAuthUser(userId, input) {
      const { data, error } = await admin.auth.admin.updateUserById(userId, {
        email: input.email,
        password: input.password,
        email_confirm: input.emailConfirmed,
        user_metadata: authMetadata(input),
      });
      if (error || !data.user) {
        throw new Error(`Failed to update auth user: ${error?.message ?? "unknown error"}`);
      }
      return toAuthUser(data.user);
    },

    async upsertProfile(input: UpsertProfileInput) {
      const { error } = await admin.from("profiles").upsert(
        {
          id: input.id,
          username: input.username,
          access_status: input.accessStatus,
        } as never,
        { onConflict: "id" },
      );
      if (error) {
        throw new Error(`Failed to upsert profile: ${error.message}`);
      }
    },

    async selectRows<T extends Record<string, unknown>>(
      table: string,
      filters: Record<string, string | string[]>,
      columns: string,
    ) {
      let query = admin.from(table).select(columns);
      for (const [column, value] of Object.entries(filters)) {
        query = Array.isArray(value) ? query.in(column, value) : query.eq(column, value);
      }
      const { data, error } = await query;
      if (error) {
        throw new Error(`Failed to select ${table}: ${error.message}`);
      }
      return (data ?? []) as T[];
    },

    async deleteRows(table: string, filters: Record<string, string | string[]>) {
      let query = admin.from(table).delete().select("id");
      for (const [column, value] of Object.entries(filters)) {
        query = Array.isArray(value) ? query.in(column, value) : query.eq(column, value);
      }
      const { data, error } = await query;
      if (error) {
        throw new Error(`Failed to delete ${table}: ${error.message}`);
      }
      return Array.isArray(data) ? data.length : 0;
    },
  };
};
