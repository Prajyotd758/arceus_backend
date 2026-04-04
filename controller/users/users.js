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

export async function AddMember(req, res) {
  const body = req.body;

  if (!body) {
    return res.status(400).json({
      message: "Invalid request",
    });
  }

  const { contact, orgId } = body;

  const client = await pool.connect();

  try {
    const result = await client.query(
      `SELECT * FROM users WHERE contact = $1`,
      [contact]
    );

    const user = result.rows[0] || null;

    console.log(user);

    if (!user) {
      return res.status(400).json({
        message:
          "No user exist.\nPlease create a user account with this contact first.",
      });
    }

    await client.query("BEGIN");
    await client.query(
      `INSERT INTO  user_organizations (user_id, org_id)
           VALUES ($1, $2)`,
      [user.id, orgId]
    );

    await client.query(
      `UPDATE users
      SET org_count = COALESCE(org_count, 0) + 1
      WHERE id = $1`,
      [user.id]
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({
      message: "Failed to add member!",
    });
  }
}
