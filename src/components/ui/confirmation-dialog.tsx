"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "default" | "destructive";
    onConfirm: () => void;
    loading?: boolean;
}

export function ConfirmationDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmText = "Ya, Lanjutkan",
    cancelText = "Kembali",
    variant = "default",
    onConfirm,
    loading = false,
}: ConfirmationDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={loading}>
                        {cancelText}
                    </Button>
                    <Button
                        variant={variant}
                        onClick={() => { onConfirm(); }}
                        disabled={loading}
                    >
                        {loading ? "Proses..." : confirmText}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
