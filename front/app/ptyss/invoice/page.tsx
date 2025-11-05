import { PTYSSPrefactura } from "@/components/ptyss/ptyss-prefactura"
import { SectionGuard } from "@/components/section-guard"

export default function PTYSSPrefacturaPage() {
  return (
    <SectionGuard module="ptyss" section="invoice">
      <PTYSSPrefactura />
    </SectionGuard>
  )
} 