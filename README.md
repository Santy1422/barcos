# Sistema de Facturación XML (Simulación)

Este proyecto es una simulación de un sistema de facturación diseñado para gestionar la carga de datos desde archivos Excel, procesarlos y generar facturas. Actualmente, se enfoca en el módulo de "Trucking" y utiliza Redux Toolkit para la gestión del estado de forma centralizada.

## Características Principales

*   **Módulos:** Diseñado para soportar múltiples módulos (Trucking, Shipchandler, Agency), con el módulo de Trucking implementado para la simulación.
*   **Carga de Excel (Simulada):** Permite "subir" archivos Excel (utilizando datos mock) y procesarlos.
*   **Creación de Facturas:** Flujo para seleccionar Excel procesados y generar facturas.
*   **Gestión de Estado con Redux Toolkit:** Centraliza el estado de los archivos Excel, facturas y registros.
*   **Interfaz de Usuario Moderna:** Construida con Next.js, React, TypeScript, Tailwind CSS y componentes de shadcn/ui.
*   **Notificaciones:** Uso de toasts para feedback al usuario.
*   **Generación de XML:** Permite generar y descargar facturas en formato XML basado en una estructura predefinida.
*   **Soporte Multimódulo Parcial:** Implementación inicial para módulos de Shipchandler y Agency, conectados a Redux.

## Estructura del Proyecto

*   `app/`: Contiene las rutas y páginas de la aplicación (App Router de Next.js).
    *   `layout.tsx`: Layout principal que incluye el `ReduxProvider`.
    *   `trucking/`: Páginas específicas del módulo de Trucking.
        *   `upload/page.tsx`: Página para subir Excel.
        *   `invoice/page.tsx`: Página para crear facturas.
        *   `records/page.tsx`: Página para ver registros y facturas.
*   `components/`: Componentes reutilizables de la interfaz de usuario.
    *   `providers/redux-provider.tsx`: Proveedor para Redux.
    *   `sidebar.tsx`: Barra lateral de navegación.
    *   `toaster.tsx`: Componente para mostrar notificaciones.
    *   `trucking/`: Componentes específicos del módulo de Trucking (`TruckingUpload`, `TruckingInvoice`, `TruckingRecords`).
    *   `ui/`: Componentes de shadcn/ui (botones, cards, etc.).
*   `lib/`: Lógica y utilidades.
    *   `features/`: Slices y lógica de Redux Toolkit.
        *   `excel/excelSlice.ts`: Slice para gestionar el estado de los archivos Excel.
        *   `invoice/invoiceSlice.ts`: Slice para gestionar el estado de las facturas.
        *   `records/recordsSlice.ts`: Slice para gestionar el estado de los registros de servicios individuales.
    *   `hooks.ts`: Hooks tipados para Redux (`useAppDispatch`, `useAppSelector`).
    *   `store.ts`: Configuración del store de Redux.
*   `public/`: Archivos estáticos.

## Tecnologías Utilizadas

*   **Framework:** Next.js 14+ (App Router)
*   **Lenguaje:** TypeScript
*   **UI:** React
*   **Estilos:** Tailwind CSS
*   **Componentes UI:** shadcn/ui
*   **Gestión de Estado:** Redux Toolkit
*   **Iconos:** Lucide React

## Instalación y Puesta en Marcha

1.  **Clonar el Repositorio (si aplica):**
    \`\`\`bash
    git clone <url-del-repositorio>
    cd <nombre-del-directorio>
    \`\`\`
2.  **Instalar Dependencias:**
    Asegúrate de tener Node.js y npm (o yarn/pnpm) instalados.
    \`\`\`bash
    npm install
    \`\`\`
    O si usas yarn:
    \`\`\`bash
    yarn install
    \`\`\`
3.  **Ejecutar la Aplicación en Desarrollo:**
    \`\`\`bash
    npm run dev
    \`\`\`
    O si usas yarn:
    \`\`\`bash
    yarn dev
    \`\`\`
    La aplicación estará disponible en `http://localhost:3000`.

## Flujo de Trabajo Simulado (Módulo Trucking, Shipchandler y Agency)

El flujo de trabajo simulado es similar para los módulos de Trucking, Shipchandler y Agency. A continuación, se describe el flujo general:

1.  **Navegar a "Subir Excel":**
    *   En la barra lateral, ve al módulo deseado (ej: `Trucking > Subir Excel`).
2.  **Seleccionar Tipo y "Subir" Archivo:**
    *   Elige un "Tipo de Excel" (ej: "Servicios de Transporte").
    *   Haz clic en el input de "Archivo Excel" y selecciona cualquier archivo (la aplicación usará datos mock basados en el tipo seleccionado).
    *   Verás una notificación de "Vista previa generada". La tabla de vista previa se poblará.
3.  **Procesar y Guardar el Excel:**
    *   Haz clic en el botón "Procesar y Guardar".
    *   El sistema simulará el procesamiento y guardará la información del Excel y sus registros en el store de Redux.
    *   Recibirás una notificación de éxito. Las estadísticas de "Excel Cargados" y "Pendientes" se actualizarán.
4.  **Navegar a "Crear Factura":**
    *   En la barra lateral, ve al módulo deseado (ej: `Trucking > Crear Factura`).
5.  **Seleccionar Excel para Facturar:**
    *   El Excel que acabas de procesar (con estado "pendiente") aparecerá en la lista de "Excel Disponibles".
    *   Marca la casilla junto al Excel que deseas usar para la factura. Todos sus registros se incluirán automáticamente.
6.  **Continuar y Completar Detalles de la Factura:**
    *   Haz clic en "Continuar con Factura".
    *   En la siguiente pantalla, completa los detalles de la factura como "Cliente", "Fecha", etc.
    *   Los registros seleccionados y el resumen del total se mostrarán.
7.  **Crear la Factura (Borrador):**
    *   Haz clic en "Crear Factura".
    *   La factura se creará como un borrador y se te mostrará una vista previa.
8.  **Revisar y Finalizar la Factura:**
    *   En la vista previa, revisa todos los detalles.
    *   Haz clic en "Finalizar Factura".
    *   Esto cambiará el estado del Excel utilizado a "procesado", marcará los registros de servicio como "facturado" y finalizará la factura en Redux.
9.  **Verificar en Registros:**
    *   Navega al módulo deseado (ej: `Trucking > Registros`).
    *   La factura recién creada aparecerá en la tabla de "Facturas Creadas".
    *   Los servicios individuales asociados a esa factura también se listarán y su estado debería reflejar que han sido facturados.
    *   En la página "Subir Excel", el Excel procesado ahora aparecerá en la estadística de "Procesados" y ya no estará disponible para crear nuevas facturas (a menos que se implemente una lógica para reutilizarlos o revertir su estado).
10. **Descargar XML (Opcional):**
    *   En la vista previa de la factura (después de "Crear Factura" y antes de "Finalizar Factura"), aparecerá un botón "Descargar XML" si la factura ha sido finalizada.
    *   Al hacer clic, se descargará un archivo XML con los datos de la factura.

## Estado Actual y Próximos Pasos

*   El sistema actual es una **simulación funcional** del flujo de carga, facturación y generación de XML para los módulos de Trucking, Shipchandler y Agency, utilizando Redux Toolkit.
*   No hay persistencia de datos real (base de datos) ni generación de archivos XML/PDF.
*   **Próximos Pasos Potenciales:**
    *   Completar la integración de Redux para todas las funcionalidades de Shipchandler y Agency (ej. modales de vista previa detallada, entrada manual completa si es necesario).
    *   Desarrollar la funcionalidad real de lectura de archivos Excel (parsing).
    *   Implementar la generación de archivos PDF.
    *   Integrar una base de datos para persistencia (ej: Supabase, Neon).
    *   Añadir autenticación y gestión de usuarios.
    *   Mejorar la validación de datos y el manejo de errores.
