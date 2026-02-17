import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(req: Request) {
    try {
        const session = await requireAuth();
        const url = new URL(req.url);
        const role = session.user.role;

        // Params
        const q = url.searchParams.get("q") || "";
        // Legacy Date Strings
        const startDate = url.searchParams.get("startDate");
        const endDate = url.searchParams.get("endDate");
        // Timezone-Aware Timestamps (Preferred)
        const startTs = url.searchParams.get("startTs");
        const endTs = url.searchParams.get("endTs");
        const page = Number(url.searchParams.get("page") || "1");
        const limit = Number(url.searchParams.get("limit") || "25");
        const skip = (page - 1) * limit;

        const status = url.searchParams.get("status") || "ALL";

        // Base Filter
        const where: any = {
            // Role Filter
            ...(role === "MEKANIK" ? { mechanicId: session.user.id } : {}),
            status: { notIn: ["ANTRI", "BATAL"] }
        };

        // Status Filter Logic
        if (status === "NONE") {
            // Visits with NO invoices
            where.invoices = { none: {} };
            // Ensure we don't accidentally filter out completed visits if that's the intention, 
            // but usually this means "Visits that need invoicing"
            // For now, let's keep status filter broad on visits, but filtered by invoice presence
        } else if (status !== "ALL") {
            // Visits WITH invoices of specific status
            if (status === "VOID") {
                where.invoices = { some: { status: "VOID" } };
            } else if (status === "PAID") {
                where.invoices = { some: { status: "PAID" } };
            } else if (status === "UNPAID") {
                where.invoices = { some: { status: "UNPAID" } };
            }
        } else {
            // Default "ALL" view logic
            // Original logic was: status: { in: ["PROSES", "SELESAI"] }
            // If user explicitly asks for "ALL", do we show Cancelled? Probably not by default unless asked.
            // Let's keep the original base filter for "ALL" to keep view clean, 
            // OR if the user selects a status, we might want to cast a wider net.

            // Let's preserve the original behavior for default view:
            // "Active" visits + History

            // However, if I select "UNPAID", I want to see unpaid invoices even if visit is "SELESAI".

            // So:
            // If specific status selected -> Don't restrict visit status (except maybe exclude BATAL if desired)
            // If ALL selected -> Use original restrictive filter? Or just show all?
            // Let's stick to: Show non-cancelled visits by default.
            // where.status = { not: "BATAL" }; // Removed to use global filter
        }

        // Search Filter
        // Search Filter (Multi-word support)
        if (q) {
            const terms = q.split(" ").filter(t => t.trim() !== "");
            if (terms.length > 0) {
                where.AND = terms.map(term => ({
                    OR: [
                        { vehicle: { engineNumber: { contains: term, mode: "insensitive" } } },
                        { vehicle: { brand: { contains: term, mode: "insensitive" } } },
                        { vehicle: { model: { contains: term, mode: "insensitive" } } }, // Added model
                        { vehicle: { ownerName: { contains: term, mode: "insensitive" } } },
                        { invoices: { some: { invoiceNumber: { contains: term, mode: "insensitive" } } } }
                    ]
                }));
            }
        }

        // Date Filter (on Visit Date)
        if (startTs || endTs || startDate || endDate) {
            where.visitDate = {};

            if (startTs) {
                where.visitDate.gte = new Date(startTs);
            } else if (startDate) {
                where.visitDate.gte = new Date(startDate); // Legacy fallback (UTC midnight)
            }

            if (endTs) {
                where.visitDate.lte = new Date(endTs);
            } else if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                where.visitDate.lte = end;
            }
        }

        // Execute Query
        const [visits, total] = await Promise.all([
            prisma.visit.findMany({
                where,
                include: {
                    vehicle: true,
                    mechanic: { select: { name: true } },
                    invoices: {
                        select: { id: true, invoiceNumber: true, status: true, totalAmount: true, createdAt: true },
                        orderBy: { createdAt: 'desc' }
                    }
                },
                orderBy: { visitDate: 'desc' },
                skip,
                take: limit
            }),
            prisma.visit.count({ where })
        ]);

        // Map to maintain frontend compatibility (latest invoice)
        const mappedVisits = visits.map((v: any) => ({
            ...v,
            invoice: v.invoices?.[0] || null, // Latest invoice
            invoices: v.invoices // Expose all invoices
        }));

        return NextResponse.json({
            items: mappedVisits,
            metadata: {
                total,
                page,
                totalPages: Math.ceil(total / limit),
                hasNext: page < Math.ceil(total / limit),
                hasPrev: page > 1
            }
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Error" }, { status: 500 });
    }
}
