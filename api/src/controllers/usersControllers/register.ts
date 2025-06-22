import {  users } from "../../database";
import { Email, sendEmail } from "../../helpers/sendEmails";
import { firmarToken } from "../../middlewares/jwtUtils";
import response from "../../utils/response";


export default async (req, res) => {

  const user = await users.create(req.body);

  //@ts-ignore
  const token = await firmarToken({ mongoId: user._id });


  await user.save();



  return response(res, 200, { user: user, token: token });
}
