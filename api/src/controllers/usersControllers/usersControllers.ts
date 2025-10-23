
import login from "./login";
import register from "./register"
import reloadUser from "./reloadUser";
import getAllUsers from "./getAllUsers";
import updateUser from "./updateUser";
import deleteUser from "./deleteUser";
import resetPassword from "./resetPassword";

const usersControllers = {
  login,
  register,
  reloadUser,
  getAllUsers,
  updateUser,
  deleteUser,
  resetPassword
};

export default usersControllers;