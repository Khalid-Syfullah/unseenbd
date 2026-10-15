/**
 * Creates the first admin (or promotes an existing account) from the command line:
 *
 *   npm run admin:create -- --email you@example.com --name "Your Name"
 *
 * The password is read from the `ADMIN_PASSWORD` environment variable, or asked for in the
 * terminal (not shown). `ADMIN_EMAIL` and `ADMIN_NAME` work in place of the flags. An existing
 * account with that email becomes an admin and keeps its password unless `--reset-password` is
 * given.
 */
import { createInterface } from "node:readline";
import { eq } from "drizzle-orm";
import { isValidPassword, normalizeEmail } from "@/lib/account/rules";
import { hashPassword } from "@/server/auth/crypto";
import { registerWithPassword } from "@/server/auth/users";
import { getDb } from "@/server/db/client";
import { users } from "@/server/db/schema";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
}

function ask(question: string, hidden = false): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  return new Promise((resolve) => {
    if (hidden) {
      const out = rl as unknown as { _writeToOutput: (s: string) => void };
      out._writeToOutput = (s: string) => {
        if (s.includes(question)) process.stdout.write(s);
      };
    }
    rl.question(question, (answer) => {
      if (hidden) process.stdout.write("\n");
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  const email = normalizeEmail(arg("email") ?? process.env.ADMIN_EMAIL ?? (await ask("Email: ")));
  const db = getDb();
  const existing = db.select().from(users).where(eq(users.email, email)).get();
  const resetPassword = process.argv.includes("--reset-password");

  if (existing) {
    const patch: Partial<typeof users.$inferInsert> = { role: "admin" };
    if (resetPassword || !existing.passwordHash) {
      const password = process.env.ADMIN_PASSWORD ?? (await ask("New password: ", true));
      if (!isValidPassword(password)) throw new Error("The password is too short or too long.");
      patch.passwordHash = await hashPassword(password);
    }
    db.update(users).set(patch).where(eq(users.id, existing.id)).run();
    console.log(`admin: ${email} is now an admin`);
    return;
  }

  const name = arg("name") ?? process.env.ADMIN_NAME ?? (await ask("Name: "));
  const password = process.env.ADMIN_PASSWORD ?? (await ask("Password: ", true));
  const result = await registerWithPassword({ email, password, name });
  if (!result.ok) throw new Error(`Could not create the account: ${result.error}`);
  db.update(users).set({ role: "admin" }).where(eq(users.id, result.user.id)).run();
  console.log(`admin: created ${email} (@${result.user.handle}) as an admin`);
}

main()
  .catch((error: unknown) => {
    console.error(`admin: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
