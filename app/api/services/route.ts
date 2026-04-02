import { NextResponse } from "next/server";
import { getActiveServices } from "@/config/services";

export async function GET() {
  return NextResponse.json(getActiveServices());
}
