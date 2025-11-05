import { PTYSSHistory } from "@/components/ptyss/ptyss-history"
import { SectionGuard } from "@/components/section-guard"

export default function PTYSSHistoryPage() {
  return (
    <SectionGuard module="ptyss" section="historial">
      <PTYSSHistory />
    </SectionGuard>
  )
} 