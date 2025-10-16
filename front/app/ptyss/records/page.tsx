import { PTYSSRecords } from "@/components/ptyss/ptyss-records"
import { SectionGuard } from "@/components/section-guard"

export default function PTYSSRecordsPage() {
  return (
    <SectionGuard module="shipchandler" section="records">
      <PTYSSRecords />
    </SectionGuard>
  )
} 