import InvoiceDetailClient from "@/components/billing/InvoiceDetailClient";
import { requireAuth } from "@/lib/auth";

export const metadata = {
    title: "Detail Invoice",
};

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
    await requireAuth();
    const { id } = await params;
    return <InvoiceDetailClient invoiceId={id} />;
}
