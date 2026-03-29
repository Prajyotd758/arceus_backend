import { pool } from "../../index.js";

export async function AddBuisness(req, res) {
  const body = req.body;

  if (!body) {
    return res.status(400).json({
      message: "Invalid request",
    });
  }

  const { buisnessName, userId } = body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const productResult = await pool.query(
      `INSERT INTO organizations (name)
         VALUES ($1)
         RETURNING id`,
      [buisnessName]
    );

    const orgId = productResult.rows[0].id;

    await client.query(
      `INSERT INTO  user_organizations (user_id, org_id)
           VALUES ($1, $2)`,
      [userId, orgId]
    );

    await client.query(
      `UPDATE users
         SET org_count = COALESCE(org_count, 0) + 1
         WHERE id = $1`,
      [userId]
    );

    await client.query("COMMIT");

    return res.status(200).json({
      message: "Buisness created successfully",
    });
  } catch (error) {
    console.log(error);
    await client.query("ROLLBACK");
    return res.status(500).json({
      message: "Failed to create buisness",
    });
  } finally {
    client.release();
  }
}

export async function AllOrganizations(req, res) {
  const userId = req.headers["user-id"];

  if (!userId) {
    return res.status(400).json({
      message: "User ID is required",
    });
  }

  try {
    const result = await pool.query(
      `SELECT o.*
         FROM organizations o
         JOIN user_organizations uo ON o.id = uo.org_id
         WHERE uo.user_id = $1`,
      [userId]
    );

    console.log("result : ", result);

    return res.status(200).json({
      message: "Organizations fetched successfully",
      data: result.rows,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}
