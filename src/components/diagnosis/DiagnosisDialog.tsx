"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import DiagnosisForm from "./DiagnosisForm";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visit: any | null;
  readonly?: boolean;
};

export default function DiagnosisDialog({
  open,
  onOpenChange,
  visit,
  readonly = false,
}: Props) {
  if (!visit) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle>Detail Kunjungan</DialogTitle>
        </DialogHeader>

        <DiagnosisForm
          visit={visit}
          readonly={readonly}
          onSuccess={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
