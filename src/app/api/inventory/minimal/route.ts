import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createMinimalSparePartSchema } from '@/lib/inventory/schemas.minimal';
import * as svc from '@/lib/inventory/service';

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const parsed = createMinimalSparePartSchema.parse(body);

    // Use default category name to satisfy existing createSparePart refine
    const payload: any = {
      code: parsed.code,
      name: parsed.name,
      category: parsed.categoryId ? undefined : 'Null',
      categoryId: parsed.categoryId ?? undefined,
      costPrice: 0,
    };

    const sp = await svc.createSparePart(payload);
    return NextResponse.json(sp, { status: 201 });
  } catch (err: any) {
    if (err?.name === 'ZodError' || err?.issues) {
      return NextResponse.json({ error: 'Validation failed', issues: err?.issues || err }, { status: 422 });
    }

    return NextResponse.json({ error: err?.message || 'Bad Request' }, { status: err?.status || 400 });
  }
}
