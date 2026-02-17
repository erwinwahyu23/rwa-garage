"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import VehicleForm from "./vehicle-form";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    vehicle: {
        id: string;
        engineNumber: string;
        licensePlate?: string | null;
        brand: string;
        model: string;
        ownerName: string | null;
        phoneNumber?: string | null;
    };
    onSuccess?: () => void;
};

export default function VehicleEditDialog({
    open,
    onOpenChange,
    vehicle,
    onSuccess,
}: Props) {
    const router = useRouter();

    async function handleSubmit(values: any) {
        try {
            const res = await fetch(`/api/vehicles/${vehicle.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });

            if (!res.ok) throw new Error("Gagal mengupdate kendaraan");

            toast.success("Kendaraan berhasil diupdate");
            onOpenChange(false);
            router.refresh();
            if (onSuccess) onSuccess();
        } catch (e) {
            toast.error("Gagal mengupdate kendaraan");
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Kendaraan</DialogTitle>
                    <DialogDescription>
                        Ubah informasi kendaraan dan kepemilikan.
                    </DialogDescription>
                </DialogHeader>

                <VehicleForm
                    initialValues={{
                        engineNumber: vehicle.engineNumber,
                        licensePlate: vehicle.licensePlate || "",
                        brand: vehicle.brand,
                        model: vehicle.model,
                        ownerName: vehicle.ownerName || "",
                        phoneNumber: vehicle.phoneNumber || "",
                    }}
                    onSubmit={handleSubmit}
                    submitLabel="Update Kendaraan"
                />
            </DialogContent>
        </Dialog>
    );
}
