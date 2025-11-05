import { ShipChandlerRecords } from "@/components/shipchandler/shipchandler-records"
import { SectionGuard } from "@/components/section-guard"

export default function ShipChandlerInvoicePage() {
  return (
    <SectionGuard module="shipchandler" section="records">
      <ShipChandlerRecords />
    </SectionGuard>
  )
}

