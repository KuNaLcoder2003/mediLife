import cookieParser from "cookie-parser"
import dotenv from "dotenv"
dotenv.config()
import express from "express"
import cors from "cors"
import router from "./routes/routes.js";
const PORT = process.env.PORT
const app = express()

app.use(cors({
    origin: 'http://localhost:5173'
}))
app.use(cookieParser())
app.use(express.json())
app.use('/api/v1', router)
app.listen(PORT, () => {
    console.log('App started')
})



