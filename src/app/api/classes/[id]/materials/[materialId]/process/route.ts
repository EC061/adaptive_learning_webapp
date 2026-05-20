import { NextRequest, NextResponse } from "next/server";
import { processMaterial } from "@/lib/vlm-engine";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; materialId: string }> }
) {
  // In a real production app, this would be a webhook endpoint authenticated
  // by a secret token or an internal queue worker.
  // For this prototype, we'll accept the POST and run the background process.
  
  const { materialId } = await params;
  
  // Start the background process but don't await it
  processMaterial(materialId).catch(console.error);
  
  return NextResponse.json({ status: "processing started" }, { status: 202 });
}
