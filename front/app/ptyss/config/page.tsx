import { PTYSSConfig } from "@/components/ptyss/ptyss-config"
import { SectionGuard } from "@/components/section-guard"

export default function PTYSSConfigPage() {
  return (
    <SectionGuard module="shipchandler" section="config">
      <PTYSSConfig />
    </SectionGuard>
  )
} 