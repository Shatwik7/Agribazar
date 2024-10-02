const mysql = require('mysql2');
const auth = require('./authenticat');
const dotenv = require('dotenv');

dotenv.config();


const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: process.env.MYSQL_PORT
}).promise();


async function testConnection() {
    try {
        const connection = await pool.getConnection();
        const [rows, fields] = await connection.query('SELECT 1');
        connection.release();

        console.log('Connection to the database pool is established successfully!');
    } catch (error) {
        console.error('Error connecting to the database:', error);
    }
}


testConnection();

module.exports.AddUser = async (user) => {
    const { username, email, password, user_type } = user;
    const hashPassword = password;
    const [rows] = await pool.query(`
    INSERT INTO users (username, email, password, user_type) 
VALUES (?,?,?,?);
    `, [username, email, hashPassword, user_type]);
    return rows.insertId;
}

module.exports.deleteUser = async (id) => {
    const [rows] = await pool.query(`DELETE FROM users
    WHERE user_id =${id};`);
    console.log(rows);
}

module.exports.FindProduct = async (id) => {
    const [[rows]] = await pool.query('SELECT * FROM products WHERE product_id=? ', [id]);
    return rows;
}

module.exports.FindAllProduct = async () => {
    const [rows] = await pool.query(`SELECT * FROM products where status='active';`);
    return rows;
}
module.exports.SearchAndSortProducts = async (search, sort, limit, offset) => {
    const productsQuery = `
        SELECT * FROM products 
        WHERE product_name LIKE ? 
        ORDER BY starting_price ${sort === 'asc' ? 'ASC' : 'DESC'}
        LIMIT ? OFFSET ?
    `;
    const productsParams = [`%${search}%`, parseInt(limit), parseInt(offset)];
    const [products] = await pool.query(productsQuery, productsParams);

    const countQuery = `
        SELECT COUNT(*) as count FROM products 
        WHERE product_name LIKE ?
    `;
    const countParams = [`%${search}%`];
    const [[{ count }]] = await pool.query(countQuery, countParams);

    return { products, totalCount: count };
}
module.exports.FindAllProductByUser = async (id) => {
    const [rows] = await pool.query(`SELECT * FROM products where status='active' and seller_id=${id};`);
    return rows;
}

module.exports.FindUserById = async (id) => {
    const [[rows]] = await pool.query('SELECT * FROM users WHERE user_id = ? ;', [id]);
    return rows;
}

module.exports.setStatusCompleted = async (id) => {
    const rows = await pool.query(`UPDATE products
    SET status = 'completed'
    WHERE product_id = ${id};`);
    return rows;
};
module.exports.findSoldProduct = async (id) => {
    const [rows] = await pool.query(`SELECT 
    p.product_id,
    p.product_name,
    p.image_url,
    p.description,
    p.quantity,
    p.quality,
    p.starting_price,
    p.reserve_price,
    p.status,
    p.lng,
    p.lat,
    p.created_at,
    sp.sale_price,
    u_seller.user_id AS seller_id,
    u_seller.username AS seller_username,
    u_seller.email AS seller_email,
    u_seller.user_type AS seller_user_type,
    u_seller.created_at AS seller_created_at,
    u_buyer.user_id AS buyer_id,
    u_buyer.username AS buyer_username,
    u_buyer.email AS buyer_email,
    u_buyer.user_type AS buyer_user_type,
    u_buyer.created_at AS buyer_created_at
FROM 
    products p
JOIN 
    sold_products sp ON p.product_id = sp.product_id
JOIN 
    users u_seller ON p.seller_id = u_seller.user_id
JOIN 
    users u_buyer ON sp.buyer_id = u_buyer.user_id
WHERE 
    p.seller_id = ${id};`)
    return rows;
}
module.exports.productBought = async (id) => {
    const [rows] = await pool.query(`SELECT 
    products.product_id,
    products.product_name,
    products.image_url,
    products.description,
    products.quantity,
    products.quality,
    products.starting_price,
    products.reserve_price,
    products.status,
    products.lng,
    products.lat,
    products.created_at,
    sold_products.sale_price,
    users.user_id AS seller_id,
    users.username AS seller_username,
    users.email AS seller_email,
    users.user_type AS seller_user_type,
    users.created_at AS seller_created_at
FROM
    sold_products
        INNER JOIN
    products ON sold_products.product_id = products.product_id
        INNER JOIN
    users ON products.seller_id = users.user_id
WHERE
    sold_products.buyer_id = ${id};
`)
    return rows;
}
module.exports.addToSold = async (product_id_value, seller_id_value, buyer_id_value, sale_price_value) => {
    console.log(`${product_id_value}, ${seller_id_value}, ${buyer_id_value}, ${sale_price_value}`);
    const [rows] = await pool.query(`INSERT INTO sold_products (product_id, seller_id, buyer_id, sale_price)
    VALUES (${product_id_value}, ${seller_id_value}, ${buyer_id_value}, ${sale_price_value});
    `);
    return rows;
}
module.exports.FindUserByEmail = async (email) => {
    const [[rows]] = await pool.query('SELECT * FROM users WHERE email = ? ;', [email]);
    return rows;
}
module.exports.updateImage = async (user) => {
    const { id, image_url } = user;
    const rows = await pool.query('UPDATE users SET image_url=?  WHERE user_id = ? ;', [image_url, id]);
    console.log(rows);
    return rows;
}
module.exports.FindAndUpdate = async (user) => {
    const { username, email, id, image_url } = user;
    const rows = await pool.query('UPDATE users SET username = ?,email = ?, image_url=?  WHERE user_id = ? ;', [username, email, image_url, id]);
    return rows;
}

module.exports.FindAllUser = async () => {
    const [rows] = await pool.query('SELECT * FROM users');
    return rows;
}

module.exports.AddBid = async (req) => {
    const product_id = req.params.id;
    const bid_amount = req.body.bid_amount;
    const user_id = req.session.user_id;
    const [rows] = await pool.query('INSERT INTO bids(auction_id,bidder_id,bid_amount) values(?,?,?)', [product_id, user_id, bid_amount]);
    return rows;
}


module.exports.Bids = async (id) => {
    const [rows] = await pool.query(`
SELECT 
    bids.bid_id,
    bids.bid_amount,
    bids.bid_time,
    bidders.user_id AS bidder_id,
    bidders.username AS bidder_username,
    bidders.email AS bidder_email,
    bidders.user_type AS bidder_user_type,
    bidders.created_at AS bidder_created_at
FROM 
    products
JOIN 
    users ON products.seller_id = users.user_id
LEFT JOIN 
    bids ON products.product_id = bids.auction_id
LEFT JOIN 
    users AS bidders ON bids.bidder_id = bidders.user_id
WHERE 
    products.product_id = ${id};
`);
    return rows;
}
module.exports.addPoduct = async (req) => {
    const { product_name, description, quantity, quality, starting_price, reserve_price, image_url, lng, lat } = req.body;
    const [rows] = await pool.query(
        `INSERT INTO products (seller_id, product_name, description, quantity, quality, starting_price, reserve_price,image_url,lng,lat)
        VALUES (?, ?, ?, ?, ?, ?, ?,?,?,?);`
        , [req.session.user_id, product_name, description, quantity, quality, starting_price, reserve_price, image_url, lng, lat]
    );
    return rows.insertId;
}
module.exports.findProductNearest = async (lng, lat, radius) => {
    const [rows] = await pool.query(`
    SELECT
        *,
        (
            6371000 * ACOS(
                COS(RADIANS(${lat})) * COS(RADIANS(products.lat)) *
                COS(RADIANS(products.lng) - RADIANS(${lng})) +
                SIN(RADIANS(${lat})) * SIN(RADIANS(products.lat))
            )
        ) AS distance_in_meters
    FROM
        products
    HAVING
        distance_in_meters < ${radius};
    `);
    return rows;
}


module.exports.deleteProduct = async (id) => {
    const [rows] = await pool.query(`DELETE FROM products
    WHERE product_id =${id};`);
}


module.exports.mspset = async () => {
    const [rows] = await pool.query('SELECT * FROM crops');
    return rows;
}
module.exports.allMachinery = async () => {
    const [rows] = await pool.query(`SELECT * FROM machinery`);
    return rows;
}
module.exports.findMachineryForMerchant=async(id)=>{
    const [machineryRows] = await pool.query('SELECT * FROM machinery WHERE seller_id = ?', [id]);
    return machineryRows;
}
module.exports.findOneMachinery = async (id) => {
    const [[rows]] = await pool.query(`SELECT * FROM machinery where machinery_id=${id} `)
    return rows;
}
module.exports.updateMachineryField = async (machineryId, field, value) => {
    let sql = '';
    let params = [];

    switch (field) {
        case 'name':
            sql = 'UPDATE machinery SET machinery_name = ? WHERE machinery_id = ?';
            params = [value, machineryId];
            break;
        case 'description':
            sql = 'UPDATE machinery SET description = ? WHERE machinery_id = ?';
            params = [value, machineryId];
            break;
        case 'quantity':
            sql = 'UPDATE machinery SET quantity = ? WHERE machinery_id = ?';
            params = [value, machineryId];
            break;
        case 'state':
            sql = 'UPDATE machinery SET state = ? WHERE machinery_id = ?';
            params = [value, machineryId];
            break;
        case 'price':
            sql = 'UPDATE machinery SET price = ? WHERE machinery_id = ?';
            params = [value, machineryId];
            break;
        default:
            throw new Error('Invalid field');
    }
    await pool.query(sql, params);
};
module.exports.addMachinary = async (mach) => {
    const { seller_id, machinery_name, description, quantity, state, price, image_url } = mach;
    const [rows] = await pool.query(`
    INSERT INTO machinery (seller_id, image_url, machinery_name, description, quantity, state, price)
     VALUES (?,?,?,?,?,?,?);
    `, [seller_id, image_url, machinery_name, description, quantity, state, price]);
    return rows.insertId;
}
module.exports.updateMachinery = async (id, qty) => {
    try {
        const [result] = await pool.query(`
            UPDATE machinery
            SET quantity = CASE
                WHEN quantity - ? >= 0 THEN quantity - ?
                ELSE quantity
            END
            WHERE machinery_id = ? AND (quantity - ? >= 0);
        `, [qty, qty, id, qty]);

        // Check if any rows were updated
        if (result.changedRows > 0) {
            return true; // Updated successfully
        } else {
            return false; // No update made (quantity would go negative)
        }
    } catch (error) {
        console.error('Error updating machinery:', error);
        return false;
    }
};
module.exports.deleteMachinery = async (id) => {
    await pool.query(`DELETE FROM machinery where machinery_id=${id}`);
}

module.exports.findReview = async (id) => {
    const [rows] = await pool.query(`SELECT 
    m.review_id, 
    m.machinery_id, 
    m.user_id, 
    m.rating, 
    m.comment,
    u.username
FROM 
    machinery_reviews AS m
JOIN 
    users AS u ON m.user_id = u.user_id
where machinery_id=${id};`);
    return rows;
}

module.exports.createOrder= async (userId, totalAmount, deliveryAddress) => {
    const query = `
        INSERT INTO orders (user_id, total_amount, payment_method, payment_status, shipping_address)
        VALUES (?, ?, 'Pay on Delivery', 'pending', ?)
    `;
    const [result] = await pool.query(query, [userId, totalAmount, deliveryAddress]);
    return result.insertId;
},
module.exports.findMachineryByOrderId = async (orderId) => {
    try {
        const query = `
            SELECT 
                m.machinery_name,
                SUM(sm.quantity) AS total_quantity_bought,
                sm.sale_price AS per_unit_price,
                SUM(sm.quantity * sm.sale_price) AS total_price_bought
            FROM 
                machinery m
            JOIN 
                sold_machinery sm ON m.machinery_id = sm.machinery_id
            WHERE 
                sm.order_id = ?
            GROUP BY 
                m.machinery_name, sm.sale_price`;
        
        const [machinery] = await pool.query(query, [orderId]);
        return machinery;
    } catch (error) {
        throw error;
    }
};

module.exports.findOrdersByUserId=async(userId)=>{
    const query = `
        SELECT * 
        FROM orders 
        WHERE user_id = ? 
        ORDER BY order_date DESC`;

    const [rows, fields] = await pool.query(query, [userId]);
    return rows;
}
module.exports.addSoldMachinery= async (orderId, machineryId, sellerId, buyerId, salePrice,qty) => {
    const query = `
        INSERT INTO sold_machinery (order_id, machinery_id, seller_id, buyer_id, sale_price,quantity)
        VALUES (?, ?, ?, ?, ?,?)
    `;
    await pool.query(query, [orderId, machineryId, sellerId, buyerId, salePrice,qty]);
},

module.exports.removeCartItem= async (cartItemId) => {
    const query = `DELETE FROM cart_item WHERE cart_item_id = ?`;
    await pool.query(query, [cartItemId]);
},

module.exports.clearCart=async (userId) => {
    const query = `DELETE FROM cart WHERE user_id = ?`;
    await pool.query(query, [userId]);
}

module.exports.addReview = async (req) => {
    const insertId = await pool.query(`INSERT INTO machinery_reviews(machinery_id,user_id,rating,comment) VALUES(?,?,?,?)`, [req.params.id, req.session.user_id, req.body.rating, req.body.comment]);
    return insertId;
}

module.exports.deleteReview = async (id) => {
    await pool.query(`DELETE FROM machinery_reviews WHERE review_id=${id}`);
    return true;
}

module.exports.FindCart = async (id) => {
    var [row] = await pool.query(`SELECT * FROM cart WHERE user_id=${id}`);
    if (row.length == 0) {
        var [row] = await pool.query(`INSERT INTO cart(user_id) values(?)`, [id]);
        result = row.insertId;
    } else {
        result = row[0].cart_id;
    }
    return result
}
module.exports.FindCartItems = async (id) => {
    const [rows] = await pool.query(`SELECT ci.cart_item_id, ci.cart_id, ci.mach_id, ci.quantity, ci.created_at,
    m.machinery_id, m.seller_id, m.image_url AS mach_image_url, 
    m.machinery_name, m.description AS mach_description, m.quantity AS mach_quantity,
    m.state, m.price AS mach_price,
    u.user_id AS seller_user_id, u.username AS seller_username, u.email AS seller_email, u.user_type AS seller_user_type
    FROM cart_item ci
    JOIN machinery m ON ci.mach_id = m.machinery_id
    JOIN users u ON m.seller_id = u.user_id
    WHERE cart_id=${id};
    `);
    return rows;
}


module.exports.addCartItem = async (cart_id, mach_id, qty) => {
    try {
        const [rows] = await pool.query(`
            SELECT * FROM cart_item WHERE cart_id = ? AND mach_id = ?;
        `, [cart_id, mach_id]);

        if (rows.length === 0) {
            await pool.query(`
                INSERT INTO cart_item (cart_id, mach_id, quantity)
                VALUES (?, ?, ?);
            `, [cart_id, mach_id, qty]);
        } else {
            await pool.query(`
                UPDATE cart_item
                SET quantity = quantity + ?
                WHERE cart_id = ? AND mach_id = ?;
            `, [qty, cart_id, mach_id]);
        }

        return true; // Successfully added or updated cart item
    } catch (error) {
        console.error('Error adding/updating cart item:', error);
        return false; // Return false on error
    }
};
module.exports.removeCartItem = async (cart_id, mach_id) => {
    const [existingCartItem] = await pool.query(`SELECT * FROM cart_item WHERE cart_id = ? AND mach_id = ?;`, [cart_id, mach_id]);
    if (existingCartItem.length === 0) {
        return false; 
    }
    const quantityInCart = existingCartItem[0].quantity;
    await pool.query(`DELETE FROM cart_item WHERE cart_id = ? AND mach_id = ?;`, [cart_id, mach_id]);
    const [machineryUpdateResult] = await pool.query(`
        UPDATE machinery                                               
        SET quantity = quantity + ? 
        WHERE machinery_id = ? AND quantity >= ?;`,
        [quantityInCart, mach_id, quantityInCart]);

    if (machineryUpdateResult.affectedRows === 0) {
        return false;
    }
    return true;
}


module.exports.AddBlog = async (image_url, contents, title, user_id) => {
    var [rows] = await pool.query(`INSERT INTO blogs (user_id, image_url, title, content)
    VALUES (?,?, ?, ?);
    `, [user_id, image_url, title, contents]);
    return rows.insertId;
}

module.exports.FindAllBlog = async () => {
    let [rows] = await pool.query(`SELECT * FROM blogs`);
    return rows;
}

module.exports.countUser = async () => {
    let [[row]] = await pool.query(`SELECT COUNT(*) AS user_count FROM users;`);
    return row.user_count;
}
module.exports.countProduct = async () => {
    let [[row]] = await pool.query(`SELECT COUNT(*) AS product_count FROM products;`);
    return row.product_count;
}

module.exports.FindBlog = async (id) => {
    let [[row]] = await pool.query(`
    SELECT 
    blogs.blog_id,
    blogs.title,
    blogs.content,
    blogs.created_at AS blog_created_at,
    blogs.image_url AS blog_image_url,
    users.user_id,
    users.username,
    users.email,
    users.user_type,
    users.created_at AS user_created_at
    FROM 
    blogs
    JOIN 
    users ON blogs.user_id = users.user_id
    WHERE blog_id=${id};`);
    console.log(row);
    return row;
}

module.exports.FindComment = async (blog_id) => {
    let [row] = await pool.query(`
    SELECT 
    comments.comment_id,
    comments.blog_id,
    comments.content,
    comments.created_at AS comment_created_at,
    users.user_id,
    users.username,
    users.email,
    users.user_type,
    users.created_at AS user_created_at
FROM 
    comments
JOIN 
    users ON comments.user_id = users.user_id
    WHERE blog_id=${blog_id};`);
    console.log(row);
    return row;
}

module.exports.addComment = async (comment) => {
    const { blog_id, user_id, body } = comment;
    const result = await pool.query(`INSERT INTO comments(blog_id,user_id,content) VALUES(?,?,?)`, [blog_id, user_id, body]);
    return result;
}

module.exports.deleteBlog = async (blog_id) => {
    const result = await pool.query(`DELETE FROM blogs where blog_id=${blog_id}`)
    return result;
}

module.exports.deleteComment = async (comment_id) => {
    const result = await pool.query(`DELETE FROM comments where comment_id=${comment_id}`);
    return result;
}

module.exports.updateBlog = async (newBlog) => {
    const { title, content, image_url, blog_id } = newBlog;
    const result = await pool.query(`UPDATE blogs
    SET title = ?,
        content = ?,
        image_url = ?
    WHERE blog_id = ?;
    `, [title, content, image_url, blog_id]);
    return result.insertId;
}


