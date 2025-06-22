

import {users } from "../../database";
import { firmarToken } from "../../middlewares/jwtUtils";
import response from "../../utils/response";


export default async (req, res) => {

    const user = await users.findById( req.user.mongoId);
    if (!user) throw new Error("El usuario no existe");     
    return  response(res,200,{user: user})

    }
