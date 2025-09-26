import { useState, useCallback } from "react"

export function usePrefacturaSelection(records: any[], getRecordType: (record: any) => "local" | "trasiego") {
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([])

  const getRecordId = (record: any) => {
    return record._id || record.id || "unknown"
  }

  const getRecordClient = (record: any, clients: any[]) => {
    const data = record.data as Record<string, any>
    const clientId = data?.clientId
    
    // If no clientId, try to find by name (for legacy records)
    if (!clientId || clientId.trim() === '') {
      const recordType = getRecordType(record)
      if (recordType === 'trasiego' && data?.associate) {
        const clientByName = clients.find((c: any) => {
          if (c.type === 'juridico') {
            return c.companyName?.toLowerCase() === data.associate.toLowerCase()
          } else if (c.type === 'natural') {
            return c.fullName?.toLowerCase() === data.associate.toLowerCase()
          }
          return false
        })
        return clientByName
      }
      return null
    }
    
    // Find by ID
    return clients.find((c: any) => (c._id || c.id) === clientId)
  }

  const canSelectRecord = useCallback((record: any, clients: any[]) => {
    const recordClient = getRecordClient(record, clients)
    const recordType = getRecordType(record)
    
    // Cannot select already pre-invoiced records
    if (record.invoiceId) {
      return false
    }
    
    // If no records selected, only allow completed status
    if (selectedRecordIds.length === 0) {
      return record.status === "completado"
    }
    
    // Get first selected record for comparison
    const firstSelectedRecord = records.find((r: any) => getRecordId(r) === selectedRecordIds[0])
    if (!firstSelectedRecord) {
      return false
    }
    
    const firstSelectedClient = getRecordClient(firstSelectedRecord, clients)
    const firstSelectedType = getRecordType(firstSelectedRecord)
    
    // Must be same client, same type, and completed status
    return (
      record.status === "completado" &&
      recordClient?._id === firstSelectedClient?._id &&
      recordType === firstSelectedType
    )
  }, [selectedRecordIds, records, getRecordType])

  const handleRecordSelection = useCallback((recordId: string, checked: boolean, record: any, clients: any[]) => {
    if (checked) {
      if (!canSelectRecord(record, clients)) {
        return false
      }
      setSelectedRecordIds(prev => [...prev, recordId])
    } else {
      setSelectedRecordIds(prev => prev.filter(id => id !== recordId))
    }
    return true
  }, [canSelectRecord])

  const handleSelectAll = useCallback((checked: boolean, filteredRecords: any[], clients: any[]) => {
    if (checked) {
      const selectableIds = filteredRecords
        .filter(record => canSelectRecord(record, clients))
        .map(record => getRecordId(record))
      setSelectedRecordIds(selectableIds)
    } else {
      setSelectedRecordIds([])
    }
  }, [canSelectRecord])

  const clearSelection = () => {
    setSelectedRecordIds([])
  }

  const selectedRecords = records.filter((record: any) =>
    selectedRecordIds.includes(getRecordId(record))
  )

  return {
    selectedRecordIds,
    setSelectedRecordIds,
    selectedRecords,
    handleRecordSelection,
    handleSelectAll,
    clearSelection,
    canSelectRecord,
    getRecordId,
    getRecordClient
  }
}