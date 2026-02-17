
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationControlsProps {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    onPageChange: (page: number) => void;
    loading?: boolean;
    itemName?: string; // e.g. "data", "items", "invoices"
}

export default function PaginationControls({
    currentPage,
    totalPages,
    totalItems,
    onPageChange,
    loading = false,
    itemName = "data"
}: PaginationControlsProps) {
    if (totalItems === 0) return null;

    return (
        <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
                Halaman {currentPage} dari {totalPages} ({totalItems} {itemName})
            </div>
            <div className="space-x-2 flex">
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage <= 1 || loading}
                    className="h-8 px-2 lg:px-4"
                >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Sebelumnya</span>
                </Button>
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage >= totalPages || loading}
                    className="h-8 px-2 lg:px-4"
                >
                    <span className="hidden sm:inline">Selanjutnya</span>
                    <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
            </div>
        </div>
    );
}
