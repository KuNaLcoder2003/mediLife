import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { S3Client } from "@aws-sdk/client-s3";
import dotenv from "dotenv"
dotenv.config()
const region = process.env.AWS_REGION!
const AWS_S3_ACESS_KEY = process.env.AWS_S3_ACESS_KEY!
const AWS_S3_SECRET_KEY = process.env.AWS_S3_SECRET_KEY!
const AWS_S3_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME!
const s3Client = new S3Client({
    region: region,
    credentials: {
        accessKeyId: AWS_S3_ACESS_KEY,
        secretAccessKey: AWS_S3_SECRET_KEY
    }
})

export const uploadAsset = async (fileBuffer: Buffer, fileName: string) => {
    try {
        const params = {
            Bucket: AWS_S3_BUCKET_NAME,
            Key: `products/${fileName}`,
            Body: fileBuffer,
            ContentType: "image/jpg,jpeg,png"
        }
        const command = new PutObjectCommand(params)
        const data = await s3Client.send(command)
        if (data.$metadata.httpStatusCode !== 200) {
            return {
                valid: false,
                message: "Unable to upload asset"
            }
        }
        let url = `https://${AWS_S3_BUCKET_NAME}.s3.${region}.amazonaws.com/${params.Key}`
        return { url, valid: true, key: params.Key }
    } catch (error) {
        console.log(error)
        return {
            valid: false,
            message: error
        }
    }
}

export const getAsset = async (key: string) => {
    try {
        const params = {
            Bucket: AWS_S3_BUCKET_NAME,
            Key: key,
        }
        const command = new GetObjectCommand(params)
        const data = await s3Client.send(command)
        console.log('The fetched asset is : ', data)
    } catch (error) {
        console.log(error)
        return {
            valid: false,
            message: error
        }
    }
}