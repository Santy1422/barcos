import createClient from "./createClient";
import getAllClients from "./getAllClients";
import getClientById from "./getClientById";
import updateClient from "./updateClient";
import deleteClient from "./deleteClient";
import getActiveClients from "./getActiveClients";

const clientsControllers = {
  createClient,
  getAllClients,
  getClientById,
  updateClient,
  deleteClient,
  getActiveClients
};

export default clientsControllers;