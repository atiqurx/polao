import { NextRequest, NextResponse } from "next/server";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import crypto from "crypto";
import { biasForSource, Bias } from "@/lib/sourceBias";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ---------- tiny LRU for text->label ----------
const MAX_CACHE = 5000;
const textCache = new Map<string, Bias>(); // sha1(text) -> label
const lruSet = (m: Map<string, Bias>, k: string, v: Bias) => {
  if (m.size >= MAX_CACHE) m.delete(m.keys().next().value as string);
  m.set(k, v);
};
const sha1 = (s: string) => crypto.createHash("sha1").update(s).digest("hex");

// ---------- persistent python worker ----------
let worker: ChildProcessWithoutNullStreams | null = null;
let stdoutBuf = "";
let reqCounter = 0;
type Pending = {
  resolve: (v: any) => void;
  reject: (e: any) => void;
  timeout: NodeJS.Timeout;
};
const pending = new Map<string, Pending>();

function startWorker(): ChildProcessWithoutNullStreams {
  const env = {
    ...process.env,
    OMP_NUM_THREADS: process.env.OMP_NUM_THREADS || "1",
    MKL_NUM_THREADS: process.env.MKL_NUM_THREADS || "1",
    TOKENIZERS_PARALLELISM: "false",
  };

  const w = spawn("python3", ["model/bias_worker.py"], {
    stdio: ["pipe", "pipe", "pipe"],
    env,
  });

  w.stderr.on("data", (d) =>
    console.error("[bias-worker stderr]", d.toString())
  );

  w.stdout.on("data", (chunk) => {
    stdoutBuf += chunk.toString();
    let idx: number;
    while ((idx = stdoutBuf.indexOf("\n")) >= 0) {
      const line = stdoutBuf.slice(0, idx);
      stdoutBuf = stdoutBuf.slice(idx + 1);
      try {
        const msg = JSON.parse(line);
        const id: string | undefined = msg.id;
        if (!id) continue;
        const p = pending.get(id);
        if (p) {
          clearTimeout(p.timeout);
          pending.delete(id);
          p.resolve(msg);
        }
      } catch (e) {
        console.error("[bias-worker parse error]", e);
      }
    }
  });

  w.on("exit", (code, sig) => {
    console.error(`[bias-worker exited] code=${code} sig=${sig}`);
    // reject all in-flight
    for (const [id, p] of pending.entries()) {
      clearTimeout(p.timeout);
      p.reject(new Error("bias worker exited"));
      pending.delete(id);
    }
    worker = null;
  });

  return w;
}

function getWorker(): ChildProcessWithoutNullStreams {
  if (worker && !worker.killed) return worker;
  worker = startWorker();
  return worker;
}

function callWorker(
  items: Array<{ id: string; text: string }>,
  msTimeout = 4000
) {
  const id = `${++reqCounter}-${Date.now()}`;
  const payload = JSON.stringify({ id, items }) + "\n";
  const w = getWorker();

  return new Promise<{
    id: string;
    results: Array<{ id: string; label: Bias | "Unknown" }>;
  }>((resolve, reject) => {
    const timeout = setTimeout(() => {
      pending.delete(id);
      // soft-fail with Unknowns so UI stays responsive
      resolve({
        id,
        results: items.map((it) => ({ id: it.id, label: "Unknown" })),
      });
    }, msTimeout);

    pending.set(id, { resolve, reject, timeout });
    // Write may throw if worker just died; guard it
    try {
      w.stdin.write(payload);
    } catch (e) {
      clearTimeout(timeout);
      pending.delete(id);
      reject(e);
    }
  });
}

// ---------- helper ----------
const valid = (s: string | undefined): s is Bias =>
  s === "LEFT" || s === "CENTER" || s === "RIGHT";

// ---------- route ----------
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Batch mode
    if (Array.isArray(body?.items)) {
      const items: Array<{ id?: string; text?: string; source?: string }> =
        body.items;

      // 1) short-circuit using source map
      const ready: Array<{
        id: string;
        label: Bias;
        via: "map" | "cache" | "model";
      }> = [];
      const needModel: Array<{ id: string; text: string }> = [];

      for (const it of items) {
        const id = (it.id ?? it.source ?? crypto.randomUUID()).toString();

        // source-based mapping first
        if (it.source) {
          const mapped = biasForSource(it.source);
          if (mapped) {
            ready.push({ id, label: mapped, via: "map" });
            continue;
          }
        }

        // cache by text
        const text = (it.text ?? "").trim();
        if (text) {
          const key = sha1(text);
          const cached = textCache.get(key);
          if (cached) {
            ready.push({ id, label: cached, via: "cache" });
            continue;
          }
          needModel.push({ id, text });
        } else {
          ready.push({ id, label: "CENTER", via: "model" }); // failsafe
        }
      }

      // 2) single batched model request for remaining
      let modelResults: Array<{ id: string; label: Bias | "Unknown" }> = [];
      if (needModel.length > 0) {
        // If you want, chunk this to prevent huge batches:
        // const BATCH = 32; loop chunks and concatenate
        const resp = await callWorker(needModel);
        modelResults = resp.results;
        // fill cache
        for (const r of modelResults) {
          const text = needModel.find((x) => x.id === r.id)?.text;
          if (text && valid(r.label)) lruSet(textCache, sha1(text), r.label);
        }
      }

      const byId = new Map<string, Bias | "Unknown">();
      for (const r of ready) byId.set(r.id, r.label);
      for (const r of modelResults)
        byId.set(r.id, valid(r.label) ? r.label : "Unknown");

      const results = items.map((it) => {
        const id = (it.id ?? it.source ?? "").toString();
        const label = byId.get(id) ?? "Unknown";
        const via =
          it.source && biasForSource(it.source)
            ? "map"
            : it.text && textCache.has(sha1(it.text))
            ? "cache"
            : "model";
        return { id, label, via };
      });

      return NextResponse.json({ results }, { status: 200 });
    }

    // Single mode (back-compat)
    const { text, source } = body ?? {};
    if (!text && !source) {
      return NextResponse.json(
        { error: "Missing text or source" },
        { status: 400 }
      );
    }

    if (source) {
      const mapped = biasForSource(source);
      if (mapped) return NextResponse.json({ label: mapped, via: "map" });
    }

    const t = (text ?? "").trim();
    if (!t)
      return NextResponse.json(
        { label: "CENTER", via: "failsafe" },
        { status: 200 }
      );

    const key = sha1(t);
    const cached = textCache.get(key);
    if (cached)
      return NextResponse.json(
        { label: cached, via: "cache" },
        { status: 200 }
      );

    const resp = await callWorker([{ id: "single", text: t }]);
    const label = (resp.results[0]?.label ?? "Unknown") as Bias | "Unknown";
    if (valid(label)) lruSet(textCache, key, label as Bias);

    return NextResponse.json(
      { label, via: valid(label) ? "model" : "failsafe" },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("bias route error:", err);
    return NextResponse.json(
      { label: "CENTER", via: "failsafe", error: String(err?.message || err) },
      { status: 200 }
    );
  }
}
