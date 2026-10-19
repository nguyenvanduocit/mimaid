import { createShortLink, MAX_CODE_LENGTH } from "../_lib/short-link";

interface Env {
  SHORTLINKS: KVNamespace;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const code = await request.text();
  if (code.trim().length === 0) {
    return Response.json({ error: "Diagram is empty" }, { status: 400 });
  }
  if (code.length > MAX_CODE_LENGTH) {
    return Response.json({ error: "Diagram is too large" }, { status: 413 });
  }
  const id = await createShortLink(env.SHORTLINKS, code);
  return Response.json({ id });
};
