import { Request, Response } from "express";
import mongoose from "mongoose";
import ptyssRouteSchema from "../../database/schemas/ptyssRouteSchema";
import { response } from "../../utils";

const PTYSSRoute = mongoose.model('PTYSSRoute', ptyssRouteSchema);

const fixPTYSSRoutesIndexes = async (req: Request, res: Response) => {
  try {
    console.log('🔧 Iniciando corrección de índices de PTYSS Routes...');
    
    const db = mongoose.connection.db;
    const collection = db.collection('ptyssroutes');

    console.log('🔍 Verificando índices existentes...');
    
    // Obtener todos los índices
    const indexes = await collection.indexes();
    console.log('Índices actuales:', indexes.map(idx => idx.key));

    const results = {
      removedIndexes: [],
      createdIndexes: [],
      existingIndexes: []
    };

    // Buscar y eliminar el índice problemático
    const oldIndex = indexes.find(idx => 
      JSON.stringify(idx.key) === '{"name":1,"containerType":1,"routeType":1}'
    );

    if (oldIndex) {
      console.log('❌ Encontrado índice antiguo problemático:', oldIndex.key);
      console.log('🗑️ Eliminando índice antiguo...');
      
      try {
        await collection.dropIndex(oldIndex.key);
        results.removedIndexes.push(oldIndex.key);
        console.log('✅ Índice antiguo eliminado');
      } catch (error) {
        console.error('Error eliminando índice antiguo:', error);
      }
    } else {
      console.log('ℹ️ No se encontró el índice antiguo problemático');
    }

    // Verificar si existe el nuevo índice único
    const newIndexKey = { 
      name: 1, 
      from: 1, 
      to: 1, 
      containerType: 1, 
      routeType: 1, 
      status: 1, 
      cliente: 1, 
      routeArea: 1 
    };

    const newIndex = indexes.find(idx => 
      JSON.stringify(idx.key) === JSON.stringify(newIndexKey)
    );

    if (!newIndex) {
      console.log('➕ Creando nuevo índice único...');
      
      try {
        await collection.createIndex(newIndexKey, { unique: true });
        results.createdIndexes.push(newIndexKey);
        console.log('✅ Nuevo índice único creado');
      } catch (error) {
        console.error('Error creando nuevo índice único:', error);
      }
    } else {
      console.log('ℹ️ El nuevo índice único ya existe');
      results.existingIndexes.push(newIndexKey);
    }

    // Crear índices adicionales para consultas frecuentes
    console.log('➕ Creando índices adicionales...');
    
    const additionalIndexes = [
      { cliente: 1 },
      { routeArea: 1 },
      { from: 1, to: 1 },
      { containerType: 1 },
      { routeType: 1 },
      { status: 1 }
    ];

    for (const indexKey of additionalIndexes) {
      try {
        const exists = indexes.find(idx => 
          JSON.stringify(idx.key) === JSON.stringify(indexKey)
        );
        
        if (!exists) {
          await collection.createIndex(indexKey);
          results.createdIndexes.push(indexKey);
          console.log(`✅ Índice creado: ${JSON.stringify(indexKey)}`);
        } else {
          results.existingIndexes.push(indexKey);
          console.log(`ℹ️ Índice ya existe: ${JSON.stringify(indexKey)}`);
        }
      } catch (error) {
        console.error(`❌ Error creando índice ${JSON.stringify(indexKey)}:`, error.message);
      }
    }

    // Mostrar índices finales
    console.log('\n📋 Índices finales:');
    const finalIndexes = await collection.indexes();
    const finalIndexList = finalIndexes.map((idx, i) => ({
      index: i + 1,
      key: idx.key,
      unique: idx.unique || false
    }));

    console.log('🎉 ¡Índices de PTYSS Routes actualizados correctamente!');

    return response(res, 200, {
      message: 'Índices de PTYSS Routes actualizados correctamente',
      data: {
        removedIndexes: results.removedIndexes,
        createdIndexes: results.createdIndexes,
        existingIndexes: results.existingIndexes,
        finalIndexes: finalIndexList
      }
    });
    
  } catch (error) {
    console.error('❌ Error actualizando índices:', error);
    return response(res, 500, {
      message: 'Error actualizando índices de PTYSS Routes',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export default fixPTYSSRoutesIndexes;
