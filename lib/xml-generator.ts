// En la sección OtherItems, agregar servicios individuales
if (invoice.selectedRecords && invoice.selectedRecords.length > 0) {
  invoice.selectedRecords.forEach((record, index) => {
    const data = record.data as Record<string, any>
    const serviceCode = data.codigoServicio || data.codigo_servicio || data.service_code || invoice.serviceCode
    const containerInfo = data.contenedor || data.container || data.containerNumber || ''
    
    xml += `
      <OtherItems>
        <LineNbr>${index + 1}</LineNbr>
        <Service>${serviceCode}</Service>
        <Activity>${invoice.activityCode}</Activity>
        <Bundle>${invoice.bundle}</Bundle>
        <Description>${serviceCode} - ${containerInfo}</Description>
        <AmntTransacCur>${record.totalValue.toFixed(3)}</AmntTransacCur>
      </OtherItems>`
  })
}

// En la función generateInvoiceXML, reemplazar la sección OtherItems
if (invoice.serviceItems && invoice.serviceItems.length > 0) {
  invoice.serviceItems.forEach((item, index) => {
    xml += `
      <OtherItems>
        <LineNbr>${index + 1}</LineNbr>
        <Service>${item.serviceCode}</Service>
        <Activity>${item.activityCode}</Activity>
        <Bundle>${invoice.bundle || 'TRUCKING'}</Bundle>
        <CtrNbr>${item.containerNumber}</CtrNbr>
        <BLNbr>${item.blNumber}</BLNbr>
        <Description>${item.description}</Description>
        <AmntTransacCur>${item.amount.toFixed(3)}</AmntTransacCur>
        <TaxAmntDocCur>${(item.amount * 0.07).toFixed(3)}</TaxAmntDocCur>
        <TaxCode>O7</TaxCode>
        <CompanyCode>${invoice.companyCode || '9321'}</CompanyCode>
        <ProfitCenter>${invoice.profitCenter || ''}</ProfitCenter>
        <InternalOrder>${invoice.internalOrder || ''}</InternalOrder>
        <REF_KEY1>${invoice.refKey1 || ''}</REF_KEY1>
        <REF_KEY2>${invoice.refKey2 || ''}</REF_KEY2>
        <REF_KEY3>${invoice.refKey3 || ''}</REF_KEY3>
      </OtherItems>`
  })
} else {
  // Fallback para compatibilidad
  xml += `
    <OtherItems>
      <LineNbr>1</LineNbr>
      <Service>${invoice.serviceCode || 'TRANSPORT'}</Service>
      <Activity>${invoice.activityCode || 'CONTAINER'}</Activity>
      <Bundle>${invoice.bundle || 'TRUCKING'}</Bundle>
      <Description>${invoice.description}</Description>
      <AmntTransacCur>${invoice.subtotal.toFixed(3)}</AmntTransacCur>
      <TaxAmntDocCur>${invoice.taxAmount.toFixed(3)}</TaxAmntDocCur>
    </OtherItems>`
}