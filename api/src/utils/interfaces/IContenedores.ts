import { IImportacion } from "./IImportaciones";

export interface IContenedor {
    id?: string;
    nombreContenedor: string;
    fechaRDM: string;
    fechaEDC: string;
    tipo: string;
    packageTipo: string;
    importaciones: Array<IImportacion>;
}
