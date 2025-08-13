import { redirect } from "next/navigation"

export default function TruckingInvoiceLegacyRedirect() {
  redirect("/trucking/records")
  return null
}
