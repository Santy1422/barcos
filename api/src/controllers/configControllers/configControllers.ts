import getConfig from "./getConfig";
import updateConfig from "./updateConfig";
import createDriver from "./createDriver";
import updateDriver from "./updateDriver";
import deleteDriver from "./deleteDriver";
import createVehicle from "./createVehicle";
import updateVehicle from "./updateVehicle";
import deleteVehicle from "./deleteVehicle";
import createRoute from "./createRoute";
import updateRoute from "./updateRoute";
import deleteRoute from "./deleteRoute";
import createCustomField from "./createCustomField";
import updateCustomField from "./updateCustomField";
import deleteCustomField from "./deleteCustomField";
import getServiceSapCodes from './getServiceSapCodes';
import createServiceSapCode from './createServiceSapCode';
import updateServiceSapCode from './updateServiceSapCode';
import deleteServiceSapCode from './deleteServiceSapCode';

const configControllers = {
  getConfig,
  updateConfig,
  createDriver,
  updateDriver,
  deleteDriver,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  createRoute,
  updateRoute,
  deleteRoute,
  createCustomField,
  updateCustomField,
  deleteCustomField,
  getServiceSapCodes,
  createServiceSapCode,
  updateServiceSapCode,
  deleteServiceSapCode,
};

export default configControllers;