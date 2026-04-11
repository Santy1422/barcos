import { getNextPTYSSLocalDisplayOrder } from "../../database";
import { response } from "../../utils";

/**
 * Reserva el siguiente número de orden local (MESaa-NNN) y lo devuelve.
 * Misma lógica atómica que al crear un registro con orden vacía.
 */
export default async (req, res) => {
  const order = await getNextPTYSSLocalDisplayOrder();
  return response(res, 200, { order });
};
