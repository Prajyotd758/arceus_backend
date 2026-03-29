import { pool } from "../../index.js";

export async function AddStock(req, res) {
  const { orgId, userId, Stock } = req.body;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const item of Stock) {
      const {
        id,
        itemName,
        quantity,
        purchasingPrice,
        sellingPrice,
        totalAmount,
      } = item;

      let productId;

      if (id) {
        const existing = await client.query(
          `SELECT id FROM products WHERE id = $1`,
          [id]
        );

        if (existing.rows.length > 0) {
          const updated = await client.query(
            `UPDATE products
             SET item_name = $1,
                 price = $2,
                 stock = stock + $3
             WHERE id = $4
             RETURNING id`,
            [itemName, sellingPrice, quantity, id]
          );

          productId = updated.rows[0].id;
        } else {
          const inserted = await client.query(
            `INSERT INTO products (item_name, price, user_id, stock, org_id)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`,
            [itemName, sellingPrice, userId, quantity, orgId]
          );

          productId = inserted.rows[0].id;
        }
      } else {
        const inserted = await client.query(
          `INSERT INTO products (item_name, price, user_id, stock, org_id)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [itemName, sellingPrice, userId, quantity, orgId]
        );

        productId = inserted.rows[0].id;
      }

      await client.query(
        `INSERT INTO stock 
        (product_id, selling_price, purchasing_price, user_id, quantity, total_amount)
        VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          productId,
          sellingPrice,
          purchasingPrice,
          userId,
          quantity,
          totalAmount,
        ]
      );
    }

    await client.query("COMMIT");

    return res.status(200).json({
      message: "Stock added successfully",
    });
  } catch (err) {
    console.log(err);
    await client.query("ROLLBACK");

    return res.status(500).json({
      message: "Failed to add stock",
    });
  } finally {
    client.release();
  }
}
export async function AllStockData(req, res) {
  const body = req.body;
  if (!body) {
    return res.status(400).json({
      message: "Invalid request.",
    });
  }

  const { orgId } = body;
  try {
    const result = await pool.query(
      `select * from products where org_id = $1`,
      [orgId]
    );
    return res.status(200).json({
      message: "Products fetched successfully",
      data: result.rows,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

export async function deleteProduct(req, res) {
  const body = req.body;
  if (!body) {
    return res.status(400).json({
      message: "Invalid request",
    });
  }
  const client = await pool.connect();

  const { productId } = body;

  try {
    await client.query("BEGIN");

    const productResult = await client.query(
      `delete from stock where product_id = $1`,
      [productId]
    );
    await client.query(`delete from products where id = $1`, [productId]);

    await client.query("COMMIT");
    return res.status(200).json({
      message: "Product deleted.",
    });
  } catch (err) {
    console.log(err);
    await client.query("ROLLBACK");
    return res.status(500).json({
      message: "Failed to delete product",
    });
  } finally {
    client.release();
  }
}

export async function CreateOrder(req, res) {
  const {
    customerName,
    customerContact,
    order,
    totalAmount,
    paid,
    remaining,
    paymentMethod,
    orgId,
    userId,
  } = req.body;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // ✅ 1. Insert into orders
    const orderResult = await client.query(
      `INSERT INTO orders 
      (customer_name, customer_contact, total_amount, paid, remaining, payment_method, org_id, user_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING id`,
      [
        customerName,
        customerContact,
        totalAmount,
        paid,
        remaining,
        paymentMethod,
        orgId,
        userId,
      ]
    );

    const orderId = orderResult.rows[0].id;

    // ✅ 2. Insert order items
    for (const item of order) {
      const {
        id, // product_id
        Item,
        RateCharged,
        Quantity,
        TotalAmount,
      } = item;

      await client.query(
        `INSERT INTO order_items
        (order_id, product_id, item_name, rate_charged, quantity, total_amount)
        VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          orderId,
          id,
          Item,
          Number(RateCharged),
          Number(Quantity),
          Number(TotalAmount),
        ]
      );

      // ✅ 3. Deduct stock (important for your app)
      await client.query(
        `UPDATE products
         SET stock = stock - $1
         WHERE id = $2`,
        [Number(Quantity), id]
      );
    }

    await client.query("COMMIT");

    return res.status(200).json({
      message: "Order created successfully",
      orderId,
    });
  } catch (err) {
    console.error(err);
    await client.query("ROLLBACK");

    return res.status(500).json({
      message: "Failed to create order",
    });
  } finally {
    client.release();
  }
}

export async function GetAllTransactions(req, res) {
  const orgId = req.headers["org-id"];

  console.log(req.headers);

  if (!orgId) {
    return res.status(400).json({
      message: "Organization ID is required",
    });
  }

  try {
    const result = await pool.query(
      `SELECT 
        o.id AS order_id,
        o.customer_name,
        o.customer_contact,
        o.total_amount,
        o.paid,
        o.remaining,
        o.payment_method,
        o.created_at,

        oi.id AS item_id,
        oi.product_id,
        oi.item_name,
        oi.rate_charged,
        oi.quantity,
        oi.total_amount AS item_total

      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      WHERE o.org_id = $1
      ORDER BY o.created_at DESC`,
      [orgId]
    );

    // ✅ Group items under each order
    const ordersMap = {};

    for (const row of result.rows) {
      if (!ordersMap[row.order_id]) {
        ordersMap[row.order_id] = {
          orderId: row.order_id,
          customerName: row.customer_name,
          customerContact: row.customer_contact,
          totalAmount: row.total_amount,
          paid: row.paid,
          remaining: row.remaining,
          paymentMethod: row.payment_method,
          createdAt: row.created_at,
          items: [],
        };
      }

      ordersMap[row.order_id].items.push({
        itemId: row.item_id,
        productId: row.product_id,
        itemName: row.item_name,
        rateCharged: row.rate_charged,
        quantity: row.quantity,
        totalAmount: row.item_total,
      });
    }

    return res.status(200).json({
      message: "Transactions fetched successfully",
      data: Object.values(ordersMap),
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to fetch transactions",
    });
  }
}
