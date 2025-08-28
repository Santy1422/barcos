import { Request, Response } from "express";
import { invoices, records, recordsAutoridades } from "../../database";
import mongoose from "mongoose";

const deleteInvoice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Primero obtener la factura para acceder a los registros asociados
    const invoice = await invoices.findById(id);
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Factura no encontrada"
      });
    }
    
    // Liberar los registros asociados: cambiar estado de "prefacturado"/"facturado" a "pendiente"/"cargado"
    // y eliminar la referencia a la factura
    if (invoice.relatedRecordIds && invoice.relatedRecordIds.length > 0) {
      // Determinar si es una prefactura auth (gastos de autoridades) o una factura normal
      const isAuthPrefactura = invoice.invoiceNumber && invoice.invoiceNumber.startsWith('AUTH-')
      console.log(`🔍 Tipo de factura detectado: ${isAuthPrefactura ? 'Prefactura AUTH (Autoridades)' : 'Factura Normal'}`)
      console.log(`📋 Número de factura: ${invoice.invoiceNumber}`)
      console.log(`📊 Registros asociados: ${invoice.relatedRecordIds.length}`)
      console.log(`🆔 IDs de registros asociados:`, invoice.relatedRecordIds)
      console.log(`🆔 Tipo de primer ID:`, typeof invoice.relatedRecordIds[0])
      console.log(`🆔 Invoice ID que se eliminará:`, id, typeof id)
      
      if (isAuthPrefactura) {
        // Convertir IDs a ObjectId para las consultas
        const objectIds = invoice.relatedRecordIds.map(recordId => 
          typeof recordId === 'string' ? new mongoose.Types.ObjectId(recordId) : recordId
        );
        
        // Debug: verificar registros antes de actualizar
        const recordsToUpdate = await recordsAutoridades.find({
          _id: { $in: objectIds }
        });
        console.log(`🔍 Registros encontrados en recordsAutoridades:`, recordsToUpdate.length);
        recordsToUpdate.forEach((record, index) => {
          console.log(`  ${index + 1}. ID: ${record._id}, Status: ${record.status}`);
        });
        
        // Para registros de autoridades: de "prefacturado" a "cargado"
        const resultAutoridades = await recordsAutoridades.updateMany(
          {
            _id: { $in: objectIds },
            status: { $in: ["prefacturado", "facturado"] }
          },
          {
            $set: { 
              status: "cargado"
            }
          }
        );
        
        console.log(`✅ Liberados ${resultAutoridades.modifiedCount} registros de autoridades asociados a la prefactura auth ${id}`);
        
        // Debug: verificar registros después de actualizar
        const recordsAfterUpdate = await recordsAutoridades.find({
          _id: { $in: objectIds }
        });
        console.log(`🔍 Registros después de actualizar:`);
        recordsAfterUpdate.forEach((record, index) => {
          console.log(`  ${index + 1}. ID: ${record._id}, Status: ${record.status}`);
        });
      } else {
        // Para registros normales: de "prefacturado"/"facturado" a "pendiente"
        const resultNormales = await records.updateMany(
          {
            _id: { $in: invoice.relatedRecordIds },
            status: { $in: ["prefacturado", "facturado"] },
            invoiceId: id
          },
          {
            $set: { 
              status: "pendiente",
              invoiceId: null
            }
          }
        );
        
        console.log(`✅ Liberados ${resultNormales.modifiedCount} registros normales asociados a la factura ${id}`);
      }
    }
    
    // Eliminar la factura
    await invoices.findByIdAndDelete(id);
    
    res.status(200).json({
      success: true,
      message: "Factura eliminada exitosamente y registros liberados",
      data: {
        invoice,
        recordsFreed: invoice.relatedRecordIds?.length || 0
      }
    });
  } catch (error) {
    console.error("Error al eliminar factura:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor"
    });
  }
};

export default deleteInvoice;