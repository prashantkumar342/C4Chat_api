import e from "express";
//route controllers
import { register, login, logout } from "../controllers/auth.controller.js";
import {
  fetchConversation,
  fetchMessages,
  fetchUsers,
  fetchRecipient,
} from "../controllers/fetch.controller.js";
import authentication from "../middlewares/authentication.middleware.js";

const router = e.Router();
//define routes

router.post("/user/register", register);
router.post("/user/login", login);
router.post("/user/logout", authentication, logout);
router.get("/fetch/conversations", authentication, fetchConversation);
router.get("/chat/:recipientId", authentication, fetchMessages);
router.get("/fetch/users", authentication, fetchUsers);
router.post("/fetch/recipient", authentication, fetchRecipient);

router.post("/authenticate/account", authentication, (req, res) => {
  res.status(200).json({ authentication: "success", user: req.user });
});
//export router
export default router;
