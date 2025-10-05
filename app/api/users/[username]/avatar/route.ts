import { NextRequest } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

export const runtime = "nodejs";

function toSafeName(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9-_]/g, "");
}


{/** Post Funkion zum speichern von Avataren in der Datenbank. Wird aber momentan noch nicht benutzt, da die Funktion im Frontend noch nicht implementiert wurde */}
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  const params = await context.params;
  const rawName = params.username;
  const username = toSafeName(rawName);

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return new Response("Missing file", { status: 400 });

  const allowed = ["image/png", "image/jpeg", "image/webp"];
  if (!allowed.includes(file.type)) {
    return new Response("Unsupported file type", { status: 400 });
  }

  const ext = file.type === "image/png" ? ".png" :
    file.type === "image/jpeg" ? ".jpg" : ".webp";

  const maxBytes = 2 * 1024 * 1024;
  const arr = await file.arrayBuffer();
  if (arr.byteLength > maxBytes) {
    return new Response("File too large", { status: 413 });
  }

  const avatarsDir = path.join(process.cwd(), "public", "avatars");
  await mkdir(avatarsDir, { recursive: true });

  const filePath = path.join(avatarsDir, `${username}${ext}`);
  await writeFile(filePath, Buffer.from(arr));

  return new Response(null, { status: 204 });
}