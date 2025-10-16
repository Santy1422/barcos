import { TruckingRecords } from "@/components/trucking/trucking-records"
import { SectionGuard } from "@/components/section-guard"

export default function TruckingRecordsPage() {
  return (
    <SectionGuard module="trucking" section="records">
      <TruckingRecords />
    </SectionGuard>
  )
}
