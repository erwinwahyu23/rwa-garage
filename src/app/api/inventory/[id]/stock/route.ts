import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: 'Adjust stock endpoint removed' }, { status: 404 });
}
