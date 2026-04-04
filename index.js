import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import pkg from "pg";
const { Pool } = pkg;
//
import router from "./routes/routes.js";
const app = express();

// export const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: {
//     rejectUnauthorized: false,
//   },
// });

export const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'network',
  password: '1234',
  port: 5432,
});

async function testDB() {
  try {
    const res = await pool.query("SELECT NOW()");
    console.log("DB Connected");
  } catch (err) {
    console.error("DB Connection Failed", err);
  }
}

testDB();

dotenv.config({ path: ".env.local" });

app.use(cors());
app.use(express.json());

app.use("/dev", router);

const port = process.env.port || 4000;

app.listen(port, () => {
  console.log("app running");
});
