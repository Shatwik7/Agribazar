CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    user_type ENUM('farmer', 'merchant' ,'consumer') NOT NULL,
    image_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE products (
    product_id INT AUTO_INCREMENT PRIMARY KEY,
    seller_id INT,
    product_name VARCHAR(255) NOT NULL,
    image_url VARCHAR(255),
    description TEXT,
    quantity INT,
    quality ENUM('low', 'medium', 'high'),
    starting_price DECIMAL(10, 2),
    reserve_price DECIMAL(10, 2),
    status ENUM('active', 'completed') DEFAULT 'active',
    lng DECIMAL(9, 6) NOT NULL,
    lat DECIMAL(8, 6) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_id) REFERENCES users(user_id) ON DELETE CASCADE
);
CREATE TABLE sold_products (
    sold_id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT,
    seller_id INT,
    buyer_id INT,
    sale_price DECIMAL(10, 2),
    sale_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
    FOREIGN KEY (seller_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (buyer_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE bids (
    bid_id INT AUTO_INCREMENT PRIMARY KEY,
    auction_id INT,
    bidder_id INT,
    bid_amount DECIMAL(10, 2),
    bid_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (auction_id) REFERENCES products(product_id) ON DELETE CASCADE,
    FOREIGN KEY (bidder_id) REFERENCES users(user_id) ON DELETE CASCADE
);


CREATE TABLE machinery (
    machinery_id INT AUTO_INCREMENT PRIMARY KEY,
    seller_id INT,
    image_url VARCHAR(255),
    machinery_name VARCHAR(255) NOT NULL,
    description TEXT,
    quantity INT,
    state ENUM('new', 'used'),
    price DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_id) REFERENCES users(user_id) ON DELETE CASCADE
);
CREATE TABLE blogs (
    blog_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    image_url varchar(240),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);


CREATE TABLE comments (
    comment_id INT AUTO_INCREMENT PRIMARY KEY,
    blog_id INT,
    user_id INT,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (blog_id) REFERENCES blogs(blog_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);


CREATE TABLE cart (
    cart_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);


CREATE TABLE cart_item (
    cart_item_id INT AUTO_INCREMENT PRIMARY KEY,
    cart_id INT,
    mach_id INT,
    quantity INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cart_id) REFERENCES cart(cart_id) ON DELETE CASCADE,
    FOREIGN KEY (mach_id) REFERENCES machinery(machinery_id) ON DELETE CASCADE
);


CREATE TABLE machinery_reviews (
    review_id INT AUTO_INCREMENT PRIMARY KEY,
    machinery_id INT,
    user_id INT,
    rating INT NOT NULL,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (machinery_id) REFERENCES machinery(machinery_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE crops (
    crop_id INT AUTO_INCREMENT PRIMARY KEY,
    crop_name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
    order_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_amount DECIMAL(10, 2) NOT NULL,
    status ENUM('pending', 'processing', 'completed', 'cancelled') DEFAULT 'pending',
    payment_method VARCHAR(100),
    payment_status ENUM('pending', 'paid', 'failed'),
    shipping_address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE sold_machinery (
    sold_machinery_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT,
    machinery_id INT,
    seller_id INT,
    buyer_id INT,
    quantity INT DEFAULT 0,
    sale_price DECIMAL(10, 2),
    sale_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
    FOREIGN KEY (machinery_id) REFERENCES machinery(machinery_id) ON DELETE CASCADE,
    FOREIGN KEY (seller_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (buyer_id) REFERENCES users(user_id) ON DELETE CASCADE
);


INSERT INTO `Agribazar`.`crops` (`crop_id`, `crop_name`, `price`, `created_at`) VALUES ('1', 'PADDY', '2183.00', '2024-03-02 19:49:03');
INSERT INTO `Agribazar`.`crops` (`crop_id`, `crop_name`, `price`, `created_at`) VALUES ('2', 'JOWAR', '3225.00', '2024-03-02 19:49:03');
INSERT INTO `Agribazar`.`crops` (`crop_id`, `crop_name`, `price`, `created_at`) VALUES ('3', 'BAJRA', '2500.00', '2024-03-02 19:49:03');
INSERT INTO `Agribazar`.`crops` (`crop_id`, `crop_name`, `price`, `created_at`) VALUES ('4', 'RAGI', '3846.00', '2024-03-02 19:49:03');
INSERT INTO `Agribazar`.`crops` (`crop_id`, `crop_name`, `price`, `created_at`) VALUES ('5', 'MAIZE', '2090.00', '2024-03-02 19:49:03');
INSERT INTO `Agribazar`.`crops` (`crop_id`, `crop_name`, `price`, `created_at`) VALUES ('6', 'TUR (ARHAR)', '7000.00', '2024-03-02 19:49:03');
INSERT INTO `Agribazar`.`crops` (`crop_id`, `crop_name`, `price`, `created_at`) VALUES ('7', 'MOONG', '8558.00', '2024-03-02 19:49:03');
INSERT INTO `Agribazar`.`crops` (`crop_id`, `crop_name`, `price`, `created_at`) VALUES ('8', 'URAD', '6950.00', '2024-03-02 19:49:03');
INSERT INTO `Agribazar`.`crops` (`crop_id`, `crop_name`, `price`, `created_at`) VALUES ('9', 'GROUNDNUT', '6377.00', '2024-03-02 19:49:03');
INSERT INTO `Agribazar`.`crops` (`crop_id`, `crop_name`, `price`, `created_at`) VALUES ('10', 'SUNFLOWER', '6760.00', '2024-03-02 19:49:03');
INSERT INTO `Agribazar`.`crops` (`crop_id`, `crop_name`, `price`, `created_at`) VALUES ('11', 'WHEAT', '2275.00', '2024-03-02 19:49:03');
INSERT INTO `Agribazar`.`crops` (`crop_id`, `crop_name`, `price`, `created_at`) VALUES ('12', 'BARLEY', '1850.00', '2024-03-02 19:49:03');
INSERT INTO `Agribazar`.`crops` (`crop_id`, `crop_name`, `price`, `created_at`) VALUES ('13', 'JUTE', '5050.00', '2024-03-02 19:49:03');


INSERT INTO `Agribazar`.`users` (`user_id`, `username`, `email`, `password`, `user_type`, `image_url`, `created_at`) VALUES ('73', 'Min', 'min@gmail.com', '$2b$12$pRrVyye/Z96nMxP08Ndxj.YaqkqkrdbTPQiiIef2vGDijHU/T7Kz2', 'farmer', 'https://res.cloudinary.com/dvf46axos/image/upload/w_500,h_300/q_auto/f_auto/v1718861848/AgiBazza/user/m3oqvrwirps9zpwalpyj.jpg', '2024-04-23 21:50:50');
INSERT INTO `Agribazar`.`users` (`user_id`, `username`, `email`, `password`, `user_type`, `image_url`, `created_at`) VALUES ('72', 'Guest', 'guest@gmail.com', '$2b$12$pRrVyye/Z96nMxP08Ndxj.YaqkqkrdbTPQiiIef2vGDijHU/T7Kz2', 'farmer', 'https://res.cloudinary.com/dvf46axos/image/upload/w_500,h_300/q_auto/f_auto/v1718861848/AgiBazza/user/m3oqvrwirps9zpwalpyj.jpg', '2024-04-23 21:50:50');





INSERT INTO `Agribazar`.`machinery` (`machinery_id`, `seller_id`, `image_url`, `machinery_name`, `description`, `quantity`, `state`, `price`, `created_at`) VALUES ('31', '57', 'https://res.cloudinary.com/dvf46axos/image/upload/w_500,h_300/q_auto/f_auto/v1713334780/AgiBazza/user/fkhbizfeobp626np2zxh.jpg', 'Tractors', 'DAFSHSDF HSDFHJ SDFGJSDFDFJ SFGJDSFGJSFGJDSFGJDFGJ SDFGJ SFG JSJFSJ SJ S JJSJS FGDJ SJ', '123', 'used', '3440.00', '2024-04-17 11:49:41');
INSERT INTO `Agribazar`.`machinery` (`machinery_id`, `seller_id`, `image_url`, `machinery_name`, `description`, `quantity`, `state`, `price`, `created_at`) VALUES ('32', '57', 'https://res.cloudinary.com/dvf46axos/image/upload/w_500,h_300/q_auto/f_auto/v1713334926/AgiBazza/user/gmp1grg1szfbtdp8b3un.jpg', 'Harvester-1002', 'dsga sd gasdgh asdhash asdha sdhadsdhasdh asdhasdh asdashasdhsahdasdhashda sdha sdha s', '133', 'new', '5000.00', '2024-04-17 11:52:06');
INSERT INTO `Agribazar`.`machinery` (`machinery_id`, `seller_id`, `image_url`, `machinery_name`, `description`, `quantity`, `state`, `price`, `created_at`) VALUES ('33', '57', 'https://res.cloudinary.com/dvf46axos/image/upload/w_500,h_300/q_auto/f_auto/v1713335149/AgiBazza/user/i3ebemaiqywyui7sx1zj.jpg', 'Fertilizer Drones', 'this is brilliant invation for the future', '13', 'used', '2000.00', '2024-04-17 11:55:49');
INSERT INTO `Agribazar`.`machinery` (`machinery_id`, `seller_id`, `image_url`, `machinery_name`, `description`, `quantity`, `state`, `price`, `created_at`) VALUES ('35', '83', 'https://res.cloudinary.com/dvf46axos/image/upload/v1718860578/AgiBazza/machinery/mhsmojgjbp2eo9asycw3.png', 'A-20 Fertilzer Master', 'This machinery is used for agricultural purposes.', '99', 'used', '7332.34', '2024-06-20 10:46:19');
INSERT INTO `Agribazar`.`machinery` (`machinery_id`, `seller_id`, `image_url`, `machinery_name`, `description`, `quantity`, `state`, `price`, `created_at`) VALUES ('36', '83', 'https://res.cloudinary.com/dvf46axos/image/upload/v1718860579/AgiBazza/machinery/ixkrdixo73onwumfocop.jpg', 'Aquaponic Kit', 'This machinery is used for agricultural purposes.', '68', 'used', '2448.54', '2024-06-20 10:46:20');
INSERT INTO `Agribazar`.`machinery` (`machinery_id`, `seller_id`, `image_url`, `machinery_name`, `description`, `quantity`, `state`, `price`, `created_at`) VALUES ('37', '83', 'https://res.cloudinary.com/dvf46axos/image/upload/v1718860580/AgiBazza/machinery/y9ezgkblal1bgyv32ouy.jpg', 'Crop Harveste', 'This machinery is used for agricultural purposes.', '4', 'used', '4610.11', '2024-06-20 10:46:21');
INSERT INTO `Agribazar`.`machinery` (`machinery_id`, `seller_id`, `image_url`, `machinery_name`, `description`, `quantity`, `state`, `price`, `created_at`) VALUES ('38', '83', 'https://res.cloudinary.com/dvf46axos/image/upload/v1718860581/AgiBazza/machinery/uobso9fwp5lwtwspgut0.jpg', 'Fertilizer Drone', 'This machinery is used for agricultural purposes.', '99', 'new', '9244.77', '2024-06-20 10:46:22');
INSERT INTO `Agribazar`.`machinery` (`machinery_id`, `seller_id`, `image_url`, `machinery_name`, `description`, `quantity`, `state`, `price`, `created_at`) VALUES ('39', '83', 'https://res.cloudinary.com/dvf46axos/image/upload/v1718860582/AgiBazza/machinery/ponsnxsktqmwrt61x4fu.jpg', 'P23 Fertilizer Bot', 'This machinery is used for agricultural purposes.', '16', 'new', '4784.77', '2024-06-20 10:46:23');
INSERT INTO `Agribazar`.`machinery` (`machinery_id`, `seller_id`, `image_url`, `machinery_name`, `description`, `quantity`, `state`, `price`, `created_at`) VALUES ('40', '83', 'https://res.cloudinary.com/dvf46axos/image/upload/v1718860583/AgiBazza/machinery/mmrffyg3ofoewebxyjmi.jpg', 'Plantion Bot', 'This machinery is used for agricultural purposes.', '31', 'used', '1959.42', '2024-06-20 10:46:24');
INSERT INTO `Agribazar`.`machinery` (`machinery_id`, `seller_id`, `image_url`, `machinery_name`, `description`, `quantity`, `state`, `price`, `created_at`) VALUES ('41', '83', 'https://res.cloudinary.com/dvf46axos/image/upload/v1718860583/AgiBazza/machinery/lhghndwpczy3u5x1l8j9.jpg', 'Smart Iregation', 'This machinery is used for agricultural purposes.', '5', 'used', '9255.09', '2024-06-20 10:46:24');
INSERT INTO `Agribazar`.`machinery` (`machinery_id`, `seller_id`, `image_url`, `machinery_name`, `description`, `quantity`, `state`, `price`, `created_at`) VALUES ('42', '83', 'https://res.cloudinary.com/dvf46axos/image/upload/v1718860584/AgiBazza/machinery/sgzm50wgkqhkuqnjes9k.webp', 'Tractor', 'This machinery is used for agricultural purposes.', '70', 'new', '7391.92', '2024-06-20 10:46:25');
