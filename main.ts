import { Application, Router } from "https://deno.land/x/oak@v11.1.0/mod.ts";
import { oakCors } from "https://deno.land/x/cors@v1.2.2/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import { exists } from "https://deno.land/std/fs/mod.ts";

const app = new Application();
const router = new Router();

const dbPath = path.join(Deno.cwd(), "database.db");
const db = new sqlite3.Database(dbPath);

await db.execute(`
  CREATE TABLE IF NOT EXISTS ip_records (
    id INTEGER PRIMARY KEY,
    user TEXT,
    ip TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    voted BOOLEAN
  )
`);

// Função para resetar a base de dados a cada 24 horas
setInterval(async () => {
  await db.execute("DELETE FROM ip_records");
}, 24 * 60 * 60 * 1000);

app.use(oakCors()); // Enable CORS for All Routes

router.post("/postback", async (context) => {
  const { ip } = await context.request.body().value;

  try {
    await db.execute(
      "INSERT INTO ip_records (ip, voted) VALUES (?, ?)",
      [ip, true],
    );
    context.response.body = { message: "Postback registrado com sucesso" };
  } catch (error) {
    context.response.status = 500;
    context.response.body = { error: "Erro ao registrar postback" };
  }
});

router.get("/checkip/:ip", async (context) => {
  const { ipToCheck } = context.params as { ipToCheck: string };

  try {
    const result = await db.query(
      "SELECT * FROM ip_records WHERE ip = ?",
      [ipToCheck],
    );

    if (result.length > 0) {
      context.response.body = { exists: true };
    } else {
      context.response.body = { exists: false };
    }
  } catch (error) {
    context.response.status = 500;
    context.response.body = { error: "Erro ao verificar IP" };
  }
});

app.use(router.routes());
app.use(router.allowedMethods());

console.log("Servidor rodando na porta 8000");
await app.listen({ port: 8000 });
