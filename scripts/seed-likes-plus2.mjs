#!/usr/bin/env node
/**
 * One-shot: soma +2 likes em todos os posts (IDs Blowfish / Firestore msmelo-751ee).
 * Uso: node scripts/seed-likes-plus2.mjs
 */
import { readdirSync, statSync } from "fs";
import { join, relative } from "path";

const API_KEY = "AIzaSyB5skqvTGFBj1zNMQugvvy-U0aMUIF67ck";
const PROJECT_ID = "msmelo-751ee";
const ROOT = new URL("..", import.meta.url).pathname;
const POSTS = join(ROOT, "content/posts");

function walkMarkdown(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walkMarkdown(p, out);
    else if (name.endsWith(".md") && name !== "_index.md") out.push(p);
  }
  return out;
}

function blowfishLikeId(absPath) {
  // content/posts/foo/index.md → likes_posts-foo-index.md
  const rel = relative(join(ROOT, "content"), absPath).replace(/\\/g, "/");
  return "likes_" + rel.replaceAll("/", "-");
}

async function anonSignIn() {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ returnSecureToken: true }),
    }
  );
  if (!res.ok) throw new Error(`auth ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.idToken;
}

function docUrl(docId) {
  const enc = encodeURIComponent(docId);
  return `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/likes/${enc}`;
}

async function getLikes(token, docId) {
  const res = await fetch(docUrl(docId), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`get ${docId} ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const v = data.fields?.likes;
  if (!v) return 0;
  if (v.integerValue != null) return Number(v.integerValue);
  if (v.doubleValue != null) return Number(v.doubleValue);
  return 0;
}

async function setLikes(token, docId, likes) {
  const res = await fetch(`${docUrl(docId)}?updateMask.fieldPaths=likes`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fields: { likes: { integerValue: String(likes) } },
    }),
  });
  if (!res.ok) throw new Error(`set ${docId} ${res.status}: ${await res.text()}`);
}

async function main() {
  const files = walkMarkdown(POSTS);
  const token = await anonSignIn();
  console.log(`Auth OK. ${files.length} posts.`);

  for (const file of files) {
    const id = blowfishLikeId(file);
    const cur = await getLikes(token, id);
    const next = (cur ?? 0) + 2;
    await setLikes(token, id, next);
    console.log(`${id}: ${cur ?? "(novo)"} → ${next}`);
  }
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
