import { IOrdenCompra, IOrdenCompraCompleta } from './IOrdenCompras';
import { IProducto } from './IProductos';
import { IEtiqueta } from './IEtiquetas';
import { ICliente } from './IClientes';
import { IProveedor } from './IProveedores';

export interface IImportacion extends Pick<IProducto, 'descripcionProducto' | 'cantidadSolicitada' | 'valor' | 'precioUnitario'> {
  id?: string;
  codigo: string;
  fechaRDM: string;
  totalFOB: number;
  totalVenta: number;
  cuentaCliente: number;
  cuentaPorPagar: number;
  etiquetas: Array<IEtiqueta>;
  fechaCOT: string;
  diasEntregas: number;
  cajasRollos: number;
  kg: number;
  cbm: number;
  adelantoProveedor: number;
  cuVenta: number;
  adelantoCliente: number;
  cliente: ICliente;
  proveedor: IProveedor;
  ordenCompra: IOrdenCompra;
}

//ORDENADO
// Responsable = SOLICITANTE OC
// Fecha RDM = nose que es (EDITABLE FECHA)
// Cliente Requisitor = PRIMER TEXTO OC
// Estado Compra = etiqueta (SELECCION)
// Pago Proveedor = etiqueta (SELECCION)
// Estado Producto = etiqueta (SELECCION)
// Estado Entrega = etiqueta (SELECCION)
// Estado Venta = etiqueta (SELECCION)
// Pago Cliente = etiqueta (SELECCION)
// Proveedor Adjudicado = SEÑORES OC
// Fecha COT = nose que es (EDITABLE FECHA)
// Dias de Entrega = nose que es (EDITABLE NUMERO)
// Cantidad = OC
// Cajas/Rollos = nose que es (NUMERO EDITABLE)
// KG = nose que es (NUMERO EDITABLE)
// CBM = nose que es (NUMERO EDITABLE)
// C.U. (USD FOB) = PRECIO OC DOLARES
// Total FOB = MULTIPLY({Cantidad},{C.U. (USD FOB)})
// Adelanto Proveedor = nose que es (NUMERO EDITABLE (USD))
// Cuenta por Pagar = {Total FOB}-{Adelanto Proveedor}
// Soporte Proveedor = nose que es (pero adjunta archivos)
// Fecha Cotizacion = nose que es (EDITABLE FECHA)
// C.U Venta = nose que es (EDITABLE NUMERO)
// Total Venta = MULTIPLY({Cantidad},{C.U. Venta})
// Adelanto Cliente = nose que es (EDITABLE NUMERO)
// Cuenta Cliente = {Total Venta}*1.19-{Adelanto Cliente}
// Soporte Cliente = nose que es
// Cronograma = nose que es
