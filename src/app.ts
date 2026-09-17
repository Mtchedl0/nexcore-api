import express, { type Express } from "express";
import cors from "cors";
import path from "path";
import { existsSync } from "fs";
import router from "./routes";

const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// CJS ბილდისთვის import.meta.dirname-ის ნაცვლად გამოიყენე __dirname
const frontendDist = path.join(__dirname, "..", "public");
if (existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get(/.*/, (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

export default app;