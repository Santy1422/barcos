
import { response } from "../../utils";

import { users } from "../../database";
import { firmarToken } from "../../middlewares/jwtUtils";


export default async (req, res) => {

  const {email, token2} = req.body
  const user = await users.findOne({ email:  email }).populate({
    path: 'detailCards',
}).populate({
  path: 'currentMonthBalance',
})


  if (!user) {
      response(res,400,{error: "Usuario no existe"})

  } else {

    //@ts-ignores
    const token =await  firmarToken({  mongoId: user._id })
    await user.save()
     return response(res,200,{user: user, token: token})

  }
  };