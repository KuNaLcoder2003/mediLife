import express from "express"
import authMiddleware from "../middlewares/authMiddleware.js";
import { getUserDetails, signIn, signUp, updateUserDetails } from "../controllers/users.controller.js";

const usersRouter = express.Router()

usersRouter.get('/me', authMiddleware, getUserDetails)
usersRouter.post('/address', authMiddleware)
usersRouter.patch('/me', authMiddleware, updateUserDetails)
export default usersRouter;