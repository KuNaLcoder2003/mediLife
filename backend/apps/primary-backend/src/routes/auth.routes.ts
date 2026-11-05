import express from "express"
import { signIn, signUp } from "../controllers/users.controller.js"
import { authUsingGoogle, logout, refreshHandler } from "../controllers/auth.controller.js"
import { googleAuthCallbackHandler, googleStartHandler } from "../utility/google.js"

const authRouter = express.Router()
authRouter.post('/signin', signIn)
authRouter.post('/signup', signUp)
authRouter.post('/logout', logout)
authRouter.post('/refresh', refreshHandler)
authRouter.get('/google/start', googleStartHandler)     // new: the frontend navigates here
authRouter.post('/google', authUsingGoogle)             // old fetch flow, kept for compatibility
authRouter.get('/google/verify', googleAuthCallbackHandler)
export default authRouter
