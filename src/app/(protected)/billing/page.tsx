import BillingPageClient from "@/components/billing/BillingPageClient";
import { requireAuth } from "@/lib/auth";

export const metadata = {
    title: "Billing & Invoices",
};

export default async function BillingPage() {
    await requireAuth();
    return <BillingPageClient />;
}
