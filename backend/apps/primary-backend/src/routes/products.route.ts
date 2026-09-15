import express from "express"
import { addNewProductCategory, addProductHandler } from "../controllers/product.controller.js"

const productsRouter = express.Router()

productsRouter.post('/newProduct', addProductHandler)
productsRouter.post('/newCategory', addNewProductCategory)

export default productsRouter