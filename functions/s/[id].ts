import LZString from "lz-string";
import { SHORT_ID_PATTERN } from "../_lib/short-link";

interface Env {
  SHORTLINKS: KVNamespace;
}

// Redirects to the app with the diagram in the URL hash, keeping the query
// string so `/s/:id?hideEditor` stays an embed link.
export const onRequestGet: PagesFunction<Env, "id"> = async ({ request, env, params }) => {
  const id = String(params.id);
  const code = SHORT_ID_PATTERN.test(id) ? await env.SHORTLINKS.get(id) : null;
  if (code === null) {
    return new Response("Short link not found", { status: 404 });
  }
  const target = new URL("/", request.url);
  target.search = new URL(request.url).search;
  target.hash = LZString.compressToEncodedURIComponent(code);
  return new Response(null, {
    status: 302,
    headers: { Location: target.toString(), "Cache-Control": "public, max-age=86400" },
  });
};
