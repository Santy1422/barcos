import createInvoice from "./createInvoice";
import getAllInvoices from "./getAllInvoices";
import getInvoiceById from "./getInvoiceById";
import updateInvoice from "./updateInvoice";
import deleteInvoice from "./deleteInvoice";
import getInvoicesByModule from "./getInvoicesByModule";
import getInvoicesByStatus from "./getInvoicesByStatus";
import sendXmlToSap from "./sendXmlToSap";
import testFtpConnection from "./testFtpConnection";
import debugFtpAuth from "./debugFtpAuth";

const invoicesControllers = {
  createInvoice,
  getAllInvoices,
  getInvoiceById,
  updateInvoice,
  deleteInvoice,
  getInvoicesByModule,
  getInvoicesByStatus,
  sendXmlToSap,
  testFtpConnection,
  debugFtpAuth
};

export default invoicesControllers;