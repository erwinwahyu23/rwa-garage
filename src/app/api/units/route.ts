import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
    try {
        const units = await prisma.sparePart.findMany({
            distinct: ['unit'],
            select: {
                unit: true
            },
            orderBy: {
                unit: 'asc'
            }
        });

        const list = units.map(u => u.unit).filter(Boolean);
        // Add default common units if not present
        const defaults = ["Pcs", "Set", "Liter", "Galon", "Botol", "Box", "Unit", "Kit"];
        const merged = Array.from(new Set([...defaults, ...list])).sort();

        return NextResponse.json(merged);
    } catch (err) {
        return NextResponse.json({ error: "Failed to fetch units" }, { status: 500 });
    }
}
