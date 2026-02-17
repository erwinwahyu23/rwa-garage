import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
    try {
        // 1. Get usage counts from SparePart
        const usageGroups = await prisma.sparePart.groupBy({
            by: ['unit'],
            _count: { unit: true }
        });

        const usageMap = new Map<string, number>();
        usageGroups.forEach(g => {
            if (g.unit) usageMap.set(g.unit, g._count.unit);
        });

        // 2. Get stored units
        const storedUnits = await prisma.unit.findMany({
            orderBy: { name: 'asc' }
        });

        // 3. Merge lists
        const allNames = new Set([...usageMap.keys(), ...storedUnits.map(u => u.name)]);
        // Add defaults if they are not preventing anything? 
        // Actually, defaults are "virtual". Let's maybe only return "Active" units (db or used)?
        // User wants to "Manage" them. 
        // Let's include defaults but mark them as "System" if not in DB? 
        // Or just let user create them if needed. 
        // Similar to previous logic: include defaults.
        const defaults = ["Pcs", "Set", "Liter", "Galon", "Botol", "Box", "Unit", "Kit"];
        defaults.forEach(d => allNames.add(d));

        const result = Array.from(allNames).map(name => {
            const stored = storedUnits.find(u => u.name.toLowerCase() === name.toLowerCase());
            // If stored found, use its case-preserved name? Or prefer the one that is most common?
            // Let's prefer 'stored.name' if exists, else 'name'.
            const finalName = stored ? stored.name : name;

            return {
                id: stored?.id || null,
                name: finalName,
                usage: usageMap.get(finalName) || 0,
                isStored: !!stored
            };
        }).sort((a, b) => a.name.localeCompare(b.name));

        return NextResponse.json(result);
    } catch (err) {
        return NextResponse.json({ error: "Failed to fetch units" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name } = body;

        if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });
        const trimmed = name.trim();

        // Check if exists
        const existing = await prisma.unit.findFirst({
            where: { name: { equals: trimmed, mode: "insensitive" } }
        });

        if (existing) return NextResponse.json(existing);

        const unit = await prisma.unit.create({
            data: { name: trimmed }
        });

        return NextResponse.json(unit);
    } catch (err) {
        return NextResponse.json({ error: "Failed to create unit" }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const body = await req.json();
        const { id, oldName, newName } = body;

        if (!newName || !oldName) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

        // 1. Update Unit table if ID exists
        if (id) {
            await prisma.unit.update({
                where: { id },
                data: { name: newName }
            });
        } else {
            // Check if we should create it?
            // If it was a "default" or "legacy" unit being renamed, we should create a Unit record for the new name.
            // AND we should check if newName conflicts.
            const conflict = await prisma.unit.findUnique({ where: { name: newName } });
            if (conflict) return NextResponse.json({ error: "Name already taken" }, { status: 400 });

            await prisma.unit.create({
                data: { name: newName }
            });
        }

        // 2. Cascade Update SpareParts
        // This is important: Renaming "Pcs" to "Pieces" should update all "Pcs" items.
        // We use updateMany.
        // Note: usageMap keys might be case-sensitive depending on DB collation, but we assume exact match for update.
        await prisma.sparePart.updateMany({
            where: { unit: oldName },
            data: { unit: newName }
        });

        return NextResponse.json({ success: true, name: newName });
    } catch (err) {
        return NextResponse.json({ error: "Failed to update unit" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        const name = searchParams.get("name");

        if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

        // 1. Check Usage
        const count = await prisma.sparePart.count({
            where: { unit: name }
        });

        if (count > 0) {
            return NextResponse.json({ error: `Unit sedang digunakan oleh ${count} item. Tidak dapat dihapus.` }, { status: 400 });
        }

        // 2. Delete from Unit table if exists
        if (id) {
            await prisma.unit.delete({ where: { id } });
        }

        // If it was just a default/legacy unit (no ID) and count is 0, nothing to delete explicitly.

        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: "Failed to delete unit" }, { status: 500 });
    }
}
