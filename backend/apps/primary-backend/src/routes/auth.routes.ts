import express from "express"
import { signIn, signUp } from "../controllers/users.controller.js"
import { authUsingGoogle, refreshHandler } from "../controllers/auth.controller.js"
import { googleAuthCallbackHandler } from "../utility/google.js"

const authRouter = express.Router()
authRouter.post('/signin', signIn)
authRouter.post('/signup', signUp)
authRouter.post('/refresh', refreshHandler)
authRouter.post('/google', authUsingGoogle)
authRouter.get('/google/verify', googleAuthCallbackHandler)
export default authRouter