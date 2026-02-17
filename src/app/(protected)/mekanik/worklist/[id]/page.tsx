"use client"

import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export default function VisitDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const router = useRouter()

  async function handleFinish() {
    const res = await fetch(`/api/visits/${params.id}/finish`, {
      method: "POST",
    })

    if (!res.ok) {
      const err = await res.json()
      toast.error(err.message)
      return
    }

    router.push("/mekanik/worklist")
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {/* TODO: Diagnosis Form */}

      <Button
        variant="destructive"
        onClick={handleFinish}
      >
        Selesai
      </Button>
    </div>
  )
}
<h1 className="text-xl font-bold text-red-600">
  Worklist Mekanik (MEKANIK PAGE)
</h1>

