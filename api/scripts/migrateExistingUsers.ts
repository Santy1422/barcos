/**
 * Script para migrar usuarios existentes al nuevo sistema de roles y módulos
 * 
 * Este script actualiza todos los usuarios existentes para que tengan:
 * - Campo modules (array)
 * - Campo isActive (boolean)
 * - Los administradores obtienen todos los módulos automáticamente
 */

import mongoose from 'mongoose';
import { users } from '../src/database';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/barcos';

async function migrateUsers() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Obtener todos los usuarios
    const allUsers = await users.find({});
    console.log(`📊 Encontrados ${allUsers.length} usuarios`);

    let updatedCount = 0;
    let errorCount = 0;

    for (const user of allUsers) {
      try {
        let needsUpdate = false;

        // Verificar y corregir campo modules
        if (!user.modules || !Array.isArray(user.modules)) {
          user.modules = [];
          needsUpdate = true;
          console.log(`  - Usuario ${user.email}: Agregando campo modules`);
        }

        // Verificar y corregir campo isActive
        if (user.isActive === undefined || user.isActive === null) {
          user.isActive = true; // Por defecto, usuarios existentes están activos
          needsUpdate = true;
          console.log(`  - Usuario ${user.email}: Agregando campo isActive`);
        }

        // Verificar y corregir campo role
        const validRoles = ['administrador', 'operaciones', 'facturacion', 'pendiente'];
        if (!user.role || !validRoles.includes(user.role)) {
          user.role = 'administrador'; // Por defecto, usuarios existentes son admins
          needsUpdate = true;
          console.log(`  - Usuario ${user.email}: Corrigiendo rol a administrador`);
        }

        // Si es administrador y no tiene módulos, asignar todos
        if (user.role === 'administrador' && user.modules.length === 0) {
          user.modules = ['trucking', 'shipchandler', 'agency'];
          needsUpdate = true;
          console.log(`  - Usuario ${user.email}: Asignando todos los módulos (admin)`);
        }

        // Agregar campos faltantes si no existen
        if (!user.username) {
          user.username = user.email.split('@')[0];
          needsUpdate = true;
          console.log(`  - Usuario ${user.email}: Agregando username`);
        }

        if (!user.fullName && user.name) {
          user.fullName = user.name;
          needsUpdate = true;
          console.log(`  - Usuario ${user.email}: Agregando fullName`);
        }

        // Guardar si hay cambios
        if (needsUpdate) {
          await user.save();
          updatedCount++;
          console.log(`✅ Usuario ${user.email} actualizado correctamente`);
        }

      } catch (error) {
        errorCount++;
        console.error(`❌ Error actualizando usuario ${user.email}:`, error.message);
      }
    }

    console.log('\n📈 Resumen de migración:');
    console.log(`  - Total usuarios: ${allUsers.length}`);
    console.log(`  - Actualizados: ${updatedCount}`);
    console.log(`  - Errores: ${errorCount}`);
    console.log(`  - Sin cambios: ${allUsers.length - updatedCount - errorCount}`);

    // Cerrar conexión
    await mongoose.disconnect();
    console.log('\n✅ Migración completada');
    
  } catch (error) {
    console.error('❌ Error en la migración:', error);
    process.exit(1);
  }
}

// Ejecutar migración
if (require.main === module) {
  migrateUsers()
    .then(() => {
      console.log('✨ Script finalizado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

export default migrateUsers;

