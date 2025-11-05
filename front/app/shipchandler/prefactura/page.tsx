import { ShipChandlerPrefactura } from "@/components/shipchandler/shipchandler-prefactura"
import { SectionGuard } from "@/components/section-guard"

export default function ShipChandlerPrefacturaPage() {
  return (
    <SectionGuard module="shipchandler" section="prefactura">
      <ShipChandlerPrefactura />
    </SectionGuard>
  )
}

