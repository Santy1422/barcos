import { TruckingPrefactura } from "@/components/trucking/trucking-prefactura"
import { SectionGuard } from "@/components/section-guard"

export default function TruckingPrefacturaPage() {
  return (
    <SectionGuard module="trucking" section="prefactura">
      <TruckingPrefactura />
    </SectionGuard>
  )
}


