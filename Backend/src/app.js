import express from 'express';
import dotenv from "dotenv";
import cors from "cors";
import { router } from '../router/index.js'; 

const BACKEND_URL = "http://localhost:3000";
const app = express();
dotenv.config();
app.use(express.json());
app.use(cors());
app.use("/api/v1",router);
export default app;