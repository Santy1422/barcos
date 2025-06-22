"use client"

interface Service {
  description: string
  people: string[]
  code: string
  price: number
  time: string
  date: string
}

interface InvoiceData {
  invoiceNumber: string
  client: string
  customerRuc: string
  customerDv: string
  customerAddress: string
  customerPhone: string
  date: string
  currency: string
  bankAccount: string
}

interface InvoicePreviewProps {
  invoiceData: InvoiceData
  services: Service[]
  subtotal: number
  tax: number
  total: number
}

export function InvoicePreview({ invoiceData, services, subtotal, tax, total }: InvoicePreviewProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const day = date.getDate().toString().padStart(2, "0")
    const month = (date.getMonth() + 1).toString().padStart(2, "0")
    const year = date.getFullYear()
    return { day, month, year }
  }

  const { day, month, year } = formatDate(invoiceData.date)

  return (
    <div className="bg-white p-8 border rounded-lg max-w-4xl mx-auto" style={{ fontFamily: "Arial, sans-serif" }}>
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div className="flex-1">
          <h1 className="text-2xl font-bold mb-2">PTY SHIP SUPPLIERS, S.A.</h1>
          <div className="text-sm space-y-1">
            <p>RUC: 155600922-2-2015 D.V. 69</p>
            <p>PANAMA PACIFICO, INTERNATIONAL BUSINESS PARK</p>
            <p>BUILDING 3855, FLOOR 2</p>
            <p>PANAMA, REPUBLICA DE PANAMA</p>
            <p>T. (507) 838-9806</p>
            <p>C. (507) 6349-1326</p>
            <p>F. (507) 301-0615</p>
          </div>
        </div>

        <div className="text-right">
          <div className="border-2 border-black p-2 mb-4">
            <div className="text-lg font-bold">INVOICE No. {invoiceData.invoiceNumber}</div>
            <div className="text-sm">RUC: 155600922-2-2015 D.V. 69</div>
          </div>
          <div className="flex gap-2 text-sm">
            <div className="border border-black p-1 w-8 text-center">DAY</div>
            <div className="border border-black p-1 w-8 text-center">MO</div>
            <div className="border border-black p-1 w-8 text-center">YR</div>
          </div>
          <div className="flex gap-2 text-sm mt-1">
            <div className="border border-black p-1 w-8 text-center">{day}</div>
            <div className="border border-black p-1 w-8 text-center">{month}</div>
            <div className="border border-black p-1 w-8 text-center">{year}</div>
          </div>
          <div className="text-sm mt-2">
            DATE: {day} {month} {year}
          </div>
        </div>
      </div>

      {/* Customer Info */}
      <div className="mb-6">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p>
              <strong>CUSTOMER:</strong> {invoiceData.client}
            </p>
            <p>
              <strong>RUC:</strong> {invoiceData.customerRuc}
            </p>
            <p>
              <strong>ADDRESS:</strong> {invoiceData.customerAddress.split("\n").join(", ")}
            </p>
            <p>
              <strong>TELEPHONE:</strong> {invoiceData.customerPhone}
            </p>
          </div>
        </div>
      </div>

      {/* Services Table */}
      <div className="mb-6">
        <table className="w-full border-collapse border border-black text-sm">
          <thead>
            <tr>
              <th className="border border-black p-2 text-left">DATE</th>
              <th className="border border-black p-2 text-left">DESCRIPTION</th>
              <th className="border border-black p-2 text-right">PRICE</th>
              <th className="border border-black p-2 text-right">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {services.map((service, index) => (
              <tr key={index}>
                <td className="border border-black p-2">{service.date}</td>
                <td className="border border-black p-2">
                  <div className="font-bold">{service.description}</div>
                  {service.people.map((person, i) => (
                    <div key={i}>{person}</div>
                  ))}
                  {service.code && <div className="text-xs text-gray-600">{service.code}</div>}
                  {service.time && (
                    <div className="text-xs mt-1">
                      DESCRIPTION: {service.time} - {service.description}
                    </div>
                  )}
                </td>
                <td className="border border-black p-2 text-right">
                  {invoiceData.currency}${service.price.toFixed(2)}
                </td>
                <td className="border border-black p-2 text-right">
                  {invoiceData.currency}${service.price.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex justify-end mb-6">
        <div className="text-right space-y-1">
          <div>
            Subtotal: {invoiceData.currency}${subtotal.toFixed(2)}
          </div>
          <div>
            Tax: {invoiceData.currency}${tax.toFixed(2)}
          </div>
          <div className="font-bold border-t pt-1">
            TOTAL: {invoiceData.currency}${total.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Terms and Conditions */}
      <div className="text-sm space-y-2 mb-6">
        <h3 className="font-bold">TERMS AND CONDITIONS</h3>
        <p>Payments should be made within 30 days by check or money transfer.</p>
        <p>Make check payments payable to: PTY SHIP SUPPLIERS, S.A.</p>
        <p>Money transfer to:</p>
        <p>Banco General</p>
        <p>Checking Account</p>
        <p>Account No. {invoiceData.bankAccount}</p>
      </div>

      {/* Signature */}
      <div className="text-sm">
        <p>I Confirmed that I have received the original invoice and documents.</p>
        <div className="flex justify-between mt-4">
          <div>Received by: _________________________.</div>
          <div>Date: ___________________.</div>
        </div>
      </div>
    </div>
  )
}
