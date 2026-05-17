import { prisma } from "@/lib/db/prisma";
import PublicInvoiceClient from "./PublicInvoiceClient";
import { notFound } from "next/navigation";

export default async function PublicInvoicePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const invoice = await prisma.invoice.findUnique({
        where: { id },
        include: {
            invoiceItems: true,
            visit: {
                include: {
                    vehicle: true,
                    mechanic: true
                }
            }
        }
    });

    if (!invoice) {
        return notFound();
    }

    // Convert decimal/date to JSON serializable for client component if needed
    // Next.js handles Date well in server components to client props now, but Decimal might need conversion.
    const serializableInvoice = JSON.parse(JSON.stringify(invoice));

    return <PublicInvoiceClient invoice={serializableInvoice} />;
}
