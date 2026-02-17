"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

type Visit = {
  id: string;
  visitNumber: string;
  status: string;
  createdAt: string;
  diagnosis?: string | null;
  mechanic?: { name: string } | null;
};

type Props = {
  visit: Visit;
  onDetail: () => void;
  isLast?: boolean;
};

export default function VisitTimelineItem({
  visit,
  onDetail,
  isLast = false,
}: Props) {
  return (
    <div className="relative flex gap-4">
      {/* TIMELINE LINE */}
      <div className="flex flex-col items-center">
        <div className="w-3 h-3 rounded-full bg-gray-500 mt-1" />
        {!isLast && <div className="w-px flex-1 bg-gray-300 mt-1" />}
      </div>

      {/* CONTENT */}
      <div className="border rounded p-4 flex-1 bg-white hover:bg-gray-50">
        <div className="flex justify-between items-start">
          <div>
            <div className="font-semibold">{visit.visitNumber}</div>
            <div className="text-sm text-gray-500">
              {format(new Date(visit.createdAt), "dd/MM/yyyy")} •{" "}
              {visit.mechanic?.name ?? "-"}
            </div>
          </div>

          <div>
            {visit.status === "SELESAI" && <Badge variant="default" className="bg-green-600">Selesai</Badge>}
            {visit.status === "BATAL" && <Badge variant="destructive" className="bg-red-600">Batal</Badge>}
            {visit.status === "PROSES" && <Badge variant="default" className="bg-blue-600">Proses</Badge>}
            {visit.status === "ANTRI" && <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Antri</Badge>}
            {!["SELESAI", "BATAL", "PROSES", "ANTRI"].includes(visit.status) && <Badge variant="outline">{visit.status}</Badge>}
          </div>
        </div>

        {/* DIAGNOSIS PREVIEW */}
        {visit.diagnosis && (
          <p className="text-sm text-gray-600 mt-2 line-clamp-2">
            <b>Diagnosis:</b> {visit.diagnosis}
          </p>
        )}

        <div className="mt-3">
          <Button size="sm" variant="secondary" onClick={onDetail}>
            Detail
          </Button>
        </div>
      </div>
    </div>
  );
}
