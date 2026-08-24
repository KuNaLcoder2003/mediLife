import express from "express"
import authMiddleware from "../middlewares/authMiddleware.js";
import { getUserDetails, signIn, signUp } from "../controllers/users.controller.js";

const usersRouter = express.Router()

usersRouter.get('/me', authMiddleware, getUserDetails)
usersRouter.post('/address', authMiddleware)
export default usersRouter;