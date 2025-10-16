import { PTYSSPrefactura } from "@/components/ptyss/ptyss-prefactura"
import { SectionGuard } from "@/components/section-guard"

export default function PTYSSPrefacturaPage() {
  return (
    <SectionGuard module="shipchandler" section="invoice">
      <PTYSSPrefactura />
    </SectionGuard>
  )
} 