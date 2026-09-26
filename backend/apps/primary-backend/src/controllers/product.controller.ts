import express from "express"
import type { keyWords, ProductDetails } from "../types/index.js"
import { prisma } from "@repo/db"
import { createMultipleImages, fetchProductById, uploadMultipleAssetsToCloud } from "../helpers/product.js"

export const addProductHandler = async (req: express.Request, res: express.Response) => {
    try {
        const productDetails = req.body as ProductDetails
        if (!productDetails) {
            res.status(400).json({
                message: "Please provide all the details for the product",
                valid: false
            })
            return
        }
        if (!productDetails.categoryId) {
            res.status(400).json({
                message: "Please provide product category",
                valid: false
            })
            return
        }
        const newProduct = await prisma.$transaction(async (tx) => {
            const res = await tx.products.create({
                data: productDetails
            })
            return res
        }, {
            maxWait: 5000,
            timeout: 9000
        })
        if (!newProduct) {
            res.status(403).json({
                message: "Unable to create product at the moment",
                valid: false
            })
            return
        }
        res.status(200).json({
            message: "Product created",
            valid: true,
            product: newProduct
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({
            message: "Something went wrong",
            valid: false
        })
    }
}

export const addNewProductCategory = async (req: express.Request, res: express.Response) => {
    try {
        const category = req.body as string
        if (!category) {
            res.status(400).json({
                message: "Please mention the category to add",
                valid: false
            })
            return
        }
        const newCategory = await prisma.productCategory.create({
            data: {
                category: category
            }
        })

        if (!newCategory) {
            res.status(403).json({
                message: "Unable to add new category , please try later",
                valid: false
            })
            return
        }
        res.status(200).json({
            message: "Category Created",
            valid: true
        })

    } catch (error) {
        console.log(error)
        res.status(500).json({
            message: "Something went wrong",
            valid: false
        })
    }
}



export const getProducts = async (req: express.Request, res: express.Response) => {
    console.log('Req reached')
    try {
        const keWords: keyWords = req.query as any
        if (!keWords) {
            const products = await prisma.products.findMany({
                select: {
                    productName: true,
                    id: true,
                    productDescription: true,
                    quantity: true,
                    price: true,
                    discount: true,
                    images: {
                        select: {
                            imageUrl: true,
                            id: true
                        }
                    },
                    category: {
                        select: {
                            category: true
                        }
                    }
                }
            })
            res.status(400).json({
                products,
                valid: true
            })
            return
        }
        const products = await prisma.products.findMany({
            where: {
                OR: [
                    {
                        productName: {
                            startsWith: keWords.name,
                        }
                    },
                    {
                        productName: {
                            startsWith: keWords?.category ? keWords.category : ""
                        }
                    }
                ]
            },
            select: {
                productName: true,
                id: true,
                productDescription: true,
                quantity: true,
                price: true,
                discount: true,
                images: {
                    select: {
                        imageUrl: true,
                        id: true
                    }
                },
                category: {
                    select: {
                        category: true
                    }
                }
            }
        })
        if (!products) {
            res.status(404).json({
                message: "No products found",
                valid: false
            })
            return
        }
        res.status(200).json({
            valid: true,
            products
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({
            message: "Somnething went wrong",
            valid: false
        })
    }
}

export const getProductById = async (req: express.Request, res: express.Response) => {
    try {
        const productId = req.params.productId as string
        if (!productId) {
            res.status(400).json({
                message: 'Please select a product',
                valid: false
            })
            return
        }
        const product = await fetchProductById(productId)
        if (!product) {
            res.status(404).json({
                message: "Unable to find product",
                valid: false
            })
            return
        }
        res.status(200).json({
            valid: true,
            product
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({
            message: "Somnething went wrong",
            valid: false
        })
    }
}

export const uploadImagesHandler = async (req: express.Request, res: express.Response) => {
    try {
        const productId = req.body.productId;
        const files = req.files as Express.Multer.File[]
        if (!productId) {
            res.status(400).json({
                message: 'Please select a product to upload files for',
                valid: false
            })
        }
        if (!files) {
            res.status(400).json({
                message: 'Please provide file to upload',
                valid: false
            })
            return
        }
        let fileBuffers: { fileBuffer: Buffer, fileName: string }[] = []
        for (let file of files) {
            const fileBuffer: Buffer = Buffer.from(file.buffer)
            fileBuffers.push({ fileBuffer, fileName: file.originalname })
        }

        console.log(fileBuffers)
        // return
        const result = await uploadMultipleAssetsToCloud(fileBuffers, productId)
        let assetArray: { imageUrl: string, key: string, cloudId: string, productId: string }[] = []
        if (result.valid) {
            if (result.uploaded.length > 0) {
                assetArray = result.uploaded
            }
        } else {
            assetArray = result.uploaded
        }
        const dbWrite = await createMultipleImages(assetArray)
        if (!dbWrite.valid) {
            res.json({
                message: "Unable to upload images",
                notUploaded: dbWrite.notCreated,
                valid: false
            })
            return
        }
        res.status(200).json({
            message: "Images uploaded",
            valid: true,
            productId: productId
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({
            message: "Somnething went wrong",
            valid: false
        })
    }
}

export const getProductCategories = async (req: express.Request, res: express.Response) => {
    try {
        const categories = await prisma.productCategory.findMany()
        if (!categories) {
            res.status(404).json({
                message: "Categories not found",
                valid: false
            })
            return
        }
        res.status(200).json({
            valid: true,
            categories
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({
            message: "Somnething went wrong",
            valid: false
        })
    }
}