import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { biasForSource, Bias } from "@/lib/sourceBias";

async function classifyWithPython(text: string): Promise<Bias | "Unknown"> {
  try {
    const result = await new Promise<string>((resolve, reject) => {
      const python = spawn("python3", ["model/predict_bias.py", text]);

      let output = "";
      python.stdout.on("data", (d) => (output += d.toString()));
      python.stderr.on("data", (d) => console.error(`bias stderr: ${d}`));
      python.on("close", (code) =>
        code === 0
          ? resolve(output.trim())
          : reject(new Error("Python script failed"))
      );
    });

    const label = result.toUpperCase();
    if (label === "LEFT" || label === "CENTER" || label === "RIGHT")
      return label as Bias;
    return "Unknown";
  } catch (e) {
    console.error("Python bias model error:", e);
    return "Unknown";
  }
}

export async function POST(req: NextRequest) {
  try {
    const { text, source } = await req.json();

    if (!text && !source) {
      return NextResponse.json(
        { error: "Missing text or source" },
        { status: 400 }
      );
    }

    // 1) Prefer deterministic per-source mapping
    const sourceBias = biasForSource(source);
    if (sourceBias) {
      return NextResponse.json({ label: sourceBias });
    }

    // 2) Fallback to text classifier
    const label = await classifyWithPython(text || "");
    return NextResponse.json({ label });
  } catch (err: any) {
    console.error(err);
    // Fail-safe: CENTER keeps the UI usable
    return NextResponse.json(
      { label: "CENTER", error: err.message },
      { status: 200 }
    );
  }
}
