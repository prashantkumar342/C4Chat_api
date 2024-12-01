import express from "express";
import dotenv from "dotenv";
import http from "http";
import cookieParser from "cookie-parser";
import cors from "cors";
import bodyParser from "body-parser";
import routes from "./routes/routes.js"
import connectDb from "./db/connect.js";
import socketIoServer from "./socket/socket.js";

dotenv.config({ path: "./.env" });

const app = express();
const port = process.env.PORT || 8695;
const dbUrl = process.env.DATABASE_URL;

const httpServer = http.createServer(app);
socketIoServer(httpServer);

app.use(cookieParser());
app.use(cors({ origin: process.env.APP_URL, credentials: true }));
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use("/api/v1", routes);

connectDb(dbUrl);

httpServer.listen(port, () => {
  console.log(`Server is running on port ${port} ✅`);
});
