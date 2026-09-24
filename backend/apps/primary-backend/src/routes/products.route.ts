import express from "express"
import { addNewProductCategory, addProductHandler, getProductCategories, getProducts, uploadImagesHandler } from "../controllers/product.controller.js"
import { getProductById } from "../controllers/product.controller.js"
import multer from "multer"
const memoryStorage = multer.memoryStorage()
const upload = multer({ storage: memoryStorage })

const productsRouter = express.Router()

productsRouter.post('/newProduct', addProductHandler)
productsRouter.post('/newCategory', addNewProductCategory)
productsRouter.get('/', getProducts)
productsRouter.get('/:productId', getProductById)
productsRouter.post('/newImages', upload.array("product_images", 5), uploadImagesHandler)
productsRouter.get('/categories', getProductCategories)
export default productsRouter