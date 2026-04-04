import bcrypt from "bcrypt";
import { pool } from "../../index.js";

export async function RegisterUser(req, res) {
  const body = req.body;

  if (!body) {
    return res.status(400).json({
      message: "Invalid request",
    });
  }

  const { name, contact, password } = body;
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const query = `
        INSERT INTO users (name, contact, password)
        VALUES ($1, $2, $3)
        RETURNING id, name, contact , org_count;
      `;

    const result = await pool.query(query, [name, contact, hashedPassword]);

    return res.status(200).json({
      message: "User created",
      user: result.rows[0],
    });
  } catch (err) {
    console.error("Error saving user ❌", err);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
}

export async function LoginUser(req, res) {
  const body = req.body;

  if (!body) {
    return res.status(400).json({
      message: "Invalid request",
    });
  }

  const { contact, password } = body;

  try {
    const result = await pool.query("SELECT * FROM users WHERE contact = $1", [
      contact,
    ]);

    if (result.rows.length === 0) {
      return res.status(400).json({
        message: "User not found",
      });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    return res.status(200).json({
      message: "Login successful",
      user: {
        id: user.id,
        name: user.name,
        contact: user.contact,
        org_count: user.org_count,
      },
    });
  } catch (err) {
    console.error("Error saving user ", err);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
}
