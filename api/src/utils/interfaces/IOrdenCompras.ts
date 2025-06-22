import { ICliente } from './IClientes';
import { IProducto } from './IProductos';
import { IProveedor } from './IProveedores';

export type TOrdGetAll = 'AGREGADAS' | 'PENDIENTES';

export interface IOrdenCompra {
  numero: string;
  fechaEmision: string;
  formaPago: string;
  fechaEntrega: string;
  moneda: string;
  solicitante: string;
}

export interface IOrdenCompraCompleta {
  id?: string;
  cliente: ICliente;
  proveedor: IProveedor;
  ordenCompra: IOrdenCompra;
  productos: Array<IProducto>;
  subTotal: string;
  descuentoGlobal: string;
  montoNeto: string;
  montoExento: string;
  iva: string;
  total: string;
  observacionesGenerales: string;
  observacionesPago: string;
  importada?: boolean;
}

export interface IOrdQueryGetAll {
  all: TOrdGetAll;
}
