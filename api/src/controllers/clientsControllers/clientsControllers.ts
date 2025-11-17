import createClient from "./createClient";
import getAllClients from "./getAllClients";
import getClientById from "./getClientById";
import updateClient from "./updateClient";
import deleteClient from "./deleteClient";
import getActiveClients from "./getActiveClients";
import getClientBySapCode from "./getClientBySapCode";

const clientsControllers = {
  createClient,
  getAllClients,
  getClientById,
  updateClient,
  deleteClient,
  getActiveClients,
  getClientBySapCode
};

export default clientsControllers;