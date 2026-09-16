import express from "express"
import { addNewProductCategory, addProductHandler, getProducts } from "../controllers/product.controller.js"
import { getProductById } from "../controllers/product.controller.js"

const productsRouter = express.Router()

productsRouter.post('/newProduct', addProductHandler)
productsRouter.post('/newCategory', addNewProductCategory)
productsRouter.get('/', getProducts)
productsRouter.get('/:productId', getProductById)

export default productsRouter