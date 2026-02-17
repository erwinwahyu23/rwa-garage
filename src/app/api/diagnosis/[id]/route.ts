import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await requireAuth();
        const { id } = await params;

        const visit = await prisma.visit.findUnique({
            where: { id },
            include: {
                vehicle: true,
                mechanic: {
                    select: { id: true, name: true, role: true }
                },
                items: {
                    include: {
                        sparePart: {
                            include: {
                                sellPrices: true
                            }
                        }
                    }
                }
            }
        });

        if (!visit) {
            return NextResponse.json({ message: "Data not found" }, { status: 404 });
        }

        return NextResponse.json(visit);
    } catch (error: any) {
        return NextResponse.json({ message: error.message || "Internal Error" }, { status: 500 });
    }
}
