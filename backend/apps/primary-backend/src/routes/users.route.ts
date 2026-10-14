import express from "express"
import authMiddleware from "../middlewares/authMiddleware.js";
import { addAddressHandler, getUserDetails, signIn, signUp, updateUserDetails } from "../controllers/users.controller.js";

const usersRouter = express.Router()

usersRouter.get('/me', authMiddleware, getUserDetails)
usersRouter.post('/address', authMiddleware, addAddressHandler)
usersRouter.patch('/me', authMiddleware, updateUserDetails)
export default usersRouter;