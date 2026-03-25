
import dotenv from 'dotenv'
dotenv.config({
    path: './.env'
})
import { app } from "./app.js"
import connectDB from "./db/index.js"


connectDB()
.then( () => {
    app.listen(process.env.PORT || 8000, () => {
        console.log(`Server started at PORT - ${process.env.PORT}`);
    })
})
.catch( (err) => {
    console.log("MongoDB connection failed!!!", err);
})



































/*
import express from "express"
const app = express()

( async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        const server = app.listen(process.env.PORT, () => {
            console.log(`Server started at PORT ${process.env.PORT}`);
        })
        server.on("error", (error) => {
            console.log("ERROR: ", error);
            throw error
        })
    } catch (error) {
        console.error("ERROR", error)
        throw error
    }
})()

*/