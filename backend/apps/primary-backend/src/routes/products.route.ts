import express from "express"
import { addNewProductCategory, addProductHandler, deleteProduct, editProductDetails, getProductCategories, getProducts, uploadImagesHandler } from "../controllers/product.controller.js"
import { getProductById } from "../controllers/product.controller.js"
import multer from "multer"
import authMiddleware from "../middlewares/authMiddleware.js"
import requireRole from "../middlewares/requireRole.js"
const memoryStorage = multer.memoryStorage()
const upload = multer({ storage: memoryStorage })

const productsRouter = express.Router()
const admin = [authMiddleware, requireRole("COMPANY")]

productsRouter.post('/newProduct', ...admin, addProductHandler)
productsRouter.post('/newCategory', ...admin, addNewProductCategory)
productsRouter.get('/', getProducts)
productsRouter.get('/get/:productId', getProductById)
productsRouter.post('/newImages', ...admin, upload.array("product_images", 5), uploadImagesHandler)
productsRouter.get('/categories', getProductCategories)
productsRouter.patch('/edit/:id', ...admin, editProductDetails)
productsRouter.delete('/:id', ...admin, deleteProduct)
export default productsRouter
