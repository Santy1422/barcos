import createInvoice from "./createInvoice";
import getAllInvoices from "./getAllInvoices";
import getInvoiceById from "./getInvoiceById";
import updateInvoice from "./updateInvoice";
import deleteInvoice from "./deleteInvoice";
import getInvoicesByModule from "./getInvoicesByModule";
import getInvoicesByStatus from "./getInvoicesByStatus";

const invoicesControllers = {
  createInvoice,
  getAllInvoices,
  getInvoiceById,
  updateInvoice,
  deleteInvoice,
  getInvoicesByModule,
  getInvoicesByStatus
};

export default invoicesControllers;