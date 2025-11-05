import { PTYSSRecords } from "@/components/ptyss/ptyss-records"
import { SectionGuard } from "@/components/section-guard"

export default function PTYSSRecordsPage() {
  return (
    <SectionGuard module="ptyss" section="records">
      <PTYSSRecords />
    </SectionGuard>
  )
} 