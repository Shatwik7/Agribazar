const express = require('express');
const app = express();

const crypto = require('crypto');
const dotenv = require('dotenv');
dotenv.config();
const port = process.env.PORT || 3000;
var methodOverride = require('method-override')
const ejs = require('ejs')
const ejsMate = require('ejs-mate');
const path = require('path');
const mysql = require('mysql2');
const database = require('./database');
const auth = require('./authenticat');
const flash = require('connect-flash');
const session = require('express-session');

const { locate } = require('./utils/locate.js');

const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const mapboxToken = process.env.MAPBOX_TOKEN;
const geocoder = mbxGeocoding({ accessToken: mapboxToken });


const multer = require('multer');
const { storage, trans } = require('./cloudinary/index');
const upload = multer({ storage });
const redis=require('./redis.js');
const appError = require('./utils/appError');
const catchAsync = require('./utils/asyncError');
const { compareSync } = require('bcrypt');

const { isMerchant, isFarmer, isBloger, checkMerchant, checkFarmer, validBlog, validMachinery, validUser, validBid, validProduct, validMapSearch } = require('./middleware.js');
const { mail } = require('./sendmail.js');
const { default: RedisStore } = require('connect-redis');


const sessionConfig = {
    store: new RedisStore({ client: redis }),
    secret: "secrert",
    resave: 'false',
    saveUninitialized: 'true',
    cookie: {
        httpOnly: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 24 * 7 * 60
    }
}


redis.on('error', (err) => {
    console.error('Redis error:', err);
});

app.use(methodOverride('_method'));
app.use((session(sessionConfig)));
app.use(flash());



app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(flash());
app.use(express.static(path.join(__dirname, 'public')));

const requireLogin = async(req, res, next) => {
    req.session.returnTo = req.path;
    const catchData=await redis.get(`${req.session.user_id}`);
    if (!req.session||!req.session.user_id||!catchData) {
        return res.redirect('/login');
    }
    next();
}



app.use((req, res, next) => {
    res.locals.success = req.flash('success');
    res.locals.currentUser = req.session.user_id;
    res.locals.User = req.session.user;
    res.locals.returnTo = req.session.returnTo;
    res.locals.error = req.flash('error');
    next();
})


app.get('/', (req, res) => {
    res.render('home');
})

//USER COUNT
app.get('/api/user-count', catchAsync(async (req, res) => {
    const userCount = await database.countUser();
    res.json({ count: userCount });
}));
//product count
app.get('/api/product-count', catchAsync(async (req, res) => {
    const productCount = await database.countProduct();
    res.json({ count: productCount });
}));

// get the product data to the frontend ajax call
app.get('/api/products', async (req, res) => {
    
    const { sort = '', search = '', page = 1, limit = 12 } = req.query;
    const offset = (page - 1) * limit;
    const key=`product#${sort}#${search}#${page}`;
    const cachedData = await redis.get(key);
    if(cachedData){
        return res.json(JSON.parse(cachedData));
    }
    const {products,totalCount}= await database.SearchAndSortProducts(search,sort,limit,offset);
    const data={
        products,
        totalPages: Math.ceil(totalCount/ limit)
    };
    await redis.set(key, JSON.stringify(data), 'EX', 120);
    res.json(data);
});

// renders the product from ejs
app.get('/product', catchAsync(async (req, res) => {
    res.render('product/show');
}))

//send json data of geoloaction of product to the frontend cluster map
app.get('/product/map/data', catchAsync(async (req, res) => {
    const acceptHeader = req.headers.accept || "";
    try {
        const cachedData = await redis.get('products_map_data');
        if (cachedData) {
            return res.json(JSON.parse(cachedData));
        }

        const products = await database.FindAllProduct();

        await redis.set('products_map_data', JSON.stringify(products), 'EX', 300);
        return res.json(products);
    } catch (error) {
        console.error('Error fetching or caching data:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}));

// product cluster map is render
app.get('/product/map', catchAsync(async (req, res) => {
    res.render('product/map');
}));


// data is fetch after a search input is give 
// it send the json data to the frontend cluster map
app.post('/product/map/data', validMapSearch, catchAsync(async (req, res) => {
    try {
        const search = req.body.search ? req.body.search.toLowerCase() : '';
        const address = req.body.address;
        const radius = req.body.radius;
        const addressKey = `geo#${address}`;
        const productsKey = `products#${address}#${radius}`;
        const searchKey = `products#search#${search}`;
        let geoData = await redis.get(addressKey);
        let coordinates;
        if (address && radius) {
            if (!geoData) {
                const geoResponse = await geocoder.forwardGeocode({
                    query: `${address}`,
                    limit: 1
                }).send();
                if (!geoResponse || !geoResponse.body.features || !geoResponse.body.features[0]) {
                    return res.status(400).json({ error: 'No such place' });
                }
                coordinates = geoResponse.body.features[0].geometry.coordinates;
                await redis.set(addressKey, JSON.stringify(coordinates), 'EX', 600);
            } else {
                coordinates = JSON.parse(geoData);
            }

            const [lng, lat] = coordinates;
            let products;

            let cachedProducts = await redis.get(productsKey);
            if (!cachedProducts) {
                products = await database.findProductNearest(lng, lat, radius * 1000);
                if (!products.length) {
                    return res.status(404).json({ error: 'No products found within the specified radius' });
                }
                await redis.set(productsKey, JSON.stringify(products), 'EX', 600);
            } else {
                products = JSON.parse(cachedProducts);
            }
            if (search) {
                products = products.filter(product =>
                    product.product_name.toLowerCase().includes(search) ||
                    product.description.toLowerCase().includes(search)
                );
            }

            return res.json({ products });
        }
        if (search) {
            let cachedSearchProducts = await redis.get(searchKey);
            let products;

            if (!cachedSearchProducts) {
                products = await database.FindAllProduct();
                products = products.filter(product =>
                    product.product_name.toLowerCase().includes(search) ||
                    product.description.toLowerCase().includes(search)
                );

                await redis.set(searchKey, JSON.stringify(products), 'EX', 300);
            } else {
                products = JSON.parse(cachedSearchProducts);
            }

            return res.json({ products });
        }
        return res.status(400).json({ error: 'Invalid request' });
    } catch (error) {
        console.error('Error fetching geocode or products:', error);
        res.status(500).json({ error: 'Something went wrong, please try again' });
    }
}));


//regiters product of a peticular user
app.post('/product', requireLogin, checkFarmer, upload.single('image'), validProduct, catchAsync(async (req, res) => {
    req.body.image_url = req.file.path.replace('/upload', '/upload/w_500,h_400/q_auto/f_auto');
    const insertId = await database.addPoduct(req);
    await redis.del('products_map_data');
    res.redirect(`/product/${insertId}`);
}))

// places bid on a prioduct
app.post('/bid/:id', requireLogin, validBid, catchAsync(async (req, res) => {
    console.log(req.body.amount);
    const bid = await database.AddBid(req);
    res.redirect(`/product/${req.params.id}`);
}))

//renders new product registertion form
app.get('/product/new', requireLogin, checkFarmer, catchAsync(async (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    let loc = await locate(ip);
    if (!loc.lng) {
        loc = { lng: 74.5, lat: 20 };
    }
    const catchData= await redis.get('product/new');
    if(catchData){
        const mspset=JSON.parse(catchData);
        return res.render('product/new',{mspset,loc});
    }
    const mspset = await database.mspset();
    res.render('product/new', { mspset, loc });
}))

// show the machinery enlisted by the user
app.get('/user/machinery',requireLogin,checkMerchant,catchAsync(async(req,res)=>{
    const merchantId = req.session.user_id;
    try {
        const machineryRows = await database.findMachineryForMerchant(merchantId);
        res.render('user/machinery', { machinery: machineryRows });
    } catch (err) {
        console.error('Error fetching machinery:', err);
        res.status(500).send('Error fetching machinery');
    }
}))

//show the farm products which had been sold to bidders
app.get(`/user/soldproducts`, requireLogin, checkFarmer, catchAsync(async (req, res) => {
    const soldProducts = await database.findSoldProduct(req.session.user_id);
    console.log(soldProducts);
    res.render('user/sold', { soldProducts });
}))

// show the farm product auction won by the user
app.get('/user/won', requireLogin, catchAsync(async (req, res) => {
    const products = await database.productBought(req.session.user_id);
    res.render('user/won', { products });
}))

// show the farm products been auctioned by the user
app.get('/user/products', requireLogin, checkFarmer, (async (req, res) => {
    const products = await database.FindAllProductByUser(req.session.user_id);
    res.render('user/products', { products });
}))

// sell the product to the highest bidder
app.get('/product/sold/:id', requireLogin, isFarmer, catchAsync(async (req, res) => {
    const product = await database.FindProduct(req.params.id);
    const bids = await database.Bids(req.params.id);
    if (!product) {
        req.flash('error', 'NOT FOUND');
        return res.redirect(`/product`);
    }
    if (!bids) {
        req.flash('error', 'not bids found');
        return res.redirect(`/product/${req.params.id}`);
    }
    const maxBid = bids.reduce((max, currentBid) => {
        return currentBid.bid_amount > max.bid_amount ? currentBid : max;
    }, bids[0]);
    await database.setStatusCompleted(req.params.id);
    await database.addToSold(product.product_id, product.seller_id, maxBid.bidder_id, maxBid.bid_amount);
    const maxbidder = await database.FindUserById(maxBid.bidder_id);
    mail(maxbidder.email, "Auction Won", `you have successfully won the auction please check you account and mail ther owner youself`);
    req.flash('success', 'THIS PRODUCT IS SOLD!!!');
    res.redirect(`/product/${req.params.id}`);
}))

// show the details of the single product and the bids which had been placed
app.get('/product/:id', requireLogin, catchAsync(async (req, res) => {
    if (req.params.id) {
        const value = parseInt(req.params.id);
        if (typeof value !== 'number') {
            req.flash('error', 'NOT FOUND');
            return res.redirect('/product');
        }
    } else {
        req.flash('error', 'NOT FOUND');
        return res.redirect('/product');
    }
    const product = await database.FindProduct(req.params.id);
    const bids = await database.Bids(req.params.id);
    if (!product) {
        req.flash('error', 'NOT FOUND');
        return res.redirect('/product');
    }
    res.render('product/bid', { product, bids });
}))

// send the data of the bids related to the product
app.get('/product/:id/bids',requireLogin,catchAsync(async(req,res)=>{
    const Id = req.params.id;
    try {
      const bids = await database.Bids(Id);
      res.status(400).json(bids);
    } catch (error) {
      res.status(500).send(error.message);
    }
}))



// deletes the product by the user
app.delete('/product/:id', requireLogin, isFarmer, catchAsync(async (req, res) => {
    await database.deleteProduct(req.params.id);
    res.redirect('/product');
}));

// uplods the image of the product
app.put('/product/:id', requireLogin, isFarmer, upload.single('image'), catchAsync(async (req, res) => {
    console.log(req.body, req.file);
}))

// login page is render
app.get('/login', (req, res) => {
    res.render("user/login");
})

// post the details of the user for login 
app.post('/user/login',catchAsync(async (req, res) => {
    if(req.session.User){
        return res.redirect('/product')
    }
    const user = await database.FindUserByEmail(req.body.email);
    if (!user) {
        req.flash('error', 'wrong password or username');
        return res.redirect('/login');

    }
    const isUser = await auth.login(req.body.password, user.password);
    const isDetained = await redis.get(`blacklist:${user.user_id}`);
    if (isDetained&&isUser) {
        req.flash('error', 'Your account has been detained.');
        return res.redirect('/login');
    }

    if (isUser) {
        req.session.user = user;
        req.session.user_type = user.user_type;
        req.session.user_id = user.user_id;
        await redis.set(`${req.session.user_id}`,toString(user.user_id),'EX',3600);
        req.flash('success', 'welcome back!');
        const redirectUrl = `${res.locals.returnTo}`;
        if(redirectUrl){
            return res.redirect(redirectUrl);
        }else{
            return res.redirect('/product');
        }
    }
    else {
        req.flash('error', 'wrong password or username');
        res.redirect('/login');
    }
}));

// renders the regisert form
app.get('/register', (req, res) => {
    res.render('user/register');
})

// deletes the session of the user
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/product');
})

// posts the new user info and send a email to validate
app.post('/user/new', validUser, catchAsync(async (req, res) => {
    try {
        const u = await database.FindUserByEmail(req.body.email);
        if (u) {
            req.flash('error','you are already a user');
            return res.redirect('/login');
        }
        const token = crypto.randomBytes(32).toString('hex');
        const expirationTime = 5*60;
        const userData = {
            username: req.body.username,
            email: req.body.email,
            password: await auth.hashPassword(req.body.password),
            user_type: req.body.user_type
        };
        await redis.setex(token, expirationTime, JSON.stringify(userData));
        const verificationLink = `click the following link to verify you email:http://${req.headers.host}/verify-email?token=${token}`;
        await mail(req.body.email, 'Email Verification for Agribazar', verificationLink);
        req.flash('success', "A verification email has been sent to your email address.");
        res.redirect('/login');
    } catch (error) {
        req.flash('error', 'An error occurred. Please try again.');
        res.redirect('/register');
    }
}))

// performs the verification by sumbmition
app.get('/verify-email', catchAsync(async (req, res) => {
    const token = req.query.token;
    console.log(token);
    const userData = await redis.get(token);
    console.log(userData);
    if (!userData) {
        req.flash('error', 'Invalid or expired token.');
        return res.redirect('/register');
    }
    const user = JSON.parse(userData);
    console.log(user);
    try {
        await redis.del(token);
        await database.AddUser(user);
    } catch (error) {
        req.flash('success','your email has already verified');
        return res.redirect('/login');
    }
    req.flash('success', 'Your email has been verified. You can now log in.');
    return res.redirect('/login');
}));

// show the orders placed by the user
app.get('/user/orders', requireLogin, catchAsync(async (req, res) => {
    try {
        const userId = req.session.user_id;
        const orders = await database.findOrdersByUserId(userId);
        res.render('user/orders', { orders });
    } catch (error) {
        console.error('Error fetching user orders:', error);
        res.status(500).send('Error fetching user orders');
    }
}));

// show the item in that order
app.get('/user/order/:orderId/machinery', requireLogin, catchAsync(async (req, res) => {
    const { orderId } = req.params;
    try {
        const machinery = await database.findMachineryByOrderId(orderId);
        console.log(machinery);
        res.render('user/order', { machinery });
    } catch (error) {
        console.error(`Error fetching machinery for order ${orderId}:`, error);
        res.status(500).send('Error fetching machinery');
    }
}));

// gets the details of the user
app.get('/user/:id', requireLogin, catchAsync(async (req, res) => {
    const user = await database.FindUserById(req.session.user_id);
    if(!user){
        return res.redirect('/product');
    }
    res.render('user/show', { user });
}))

// deletes the user and all the things associted with it
app.delete('/user/:id', requireLogin, catchAsync(async (req, res) => {
    await database.deleteUser(req.params.id);
    req.session.destroy();
    res.redirect('/');
}))

//uploades mew image of the user
app.put('/user/:id/change-image', upload.single('newProfileImage'), catchAsync(async (req, res) => {
    const userId = req.params.id;
    if (req.file) {
        imageUrl = req.file.path.replace('/upload', '/upload/w_500,h_300/q_auto/f_auto');
        let user = {
            image_url: imageUrl,
            id: userId
        }
        console.log(user);
        await database.updateImage(user);
        req.flash('success', 'Profile picture updated successfully.');
        return res.redirect(`/user/${userId}`);
    }
    req.flash('error', 'update failed');
    res.redirect(`/user/${userId}`);
}));


// finds and renders all the machinery 
app.get('/machinery', catchAsync(async (req, res) => {
    let machinerys = await database.allMachinery();
    const sortOption = req.query.sort;
    const searchQuery = req.query.search;
    console.log(searchQuery);
    if (searchQuery) {
        machinerys = machinerys.filter(machinery => {
            return machinery.machinery_name.toLowerCase().includes(searchQuery.toLowerCase());
        });
    }
    if (sortOption === 'asc') {
        machinerys.sort((a, b) => a.price - b.price);
    } else if (sortOption === 'desc') {
        machinerys.sort((a, b) => b.price - a.price);
    }
    const currentPage = req.query.page ? parseInt(req.query.page) : 1;
    res.render('machinery/all', { machinerys, currentPage });
}))


app.put('/machinery/:machinery_id', async (req, res, next) => {
    try {
        console.log(req.params,req.body);
        const { machinery_id } = req.params;
        const { field, value } = req.body;
        if (!field || !value) {
            return res.status(400).send('Field and value are required');
        }
        await database.updateMachineryField(machinery_id, field, value);
        const updatedMachinery = await database.getMachineryById(machinery_id);
        if (!updatedMachinery) {
            return res.status(404).send('Machinery not found after update');
        }
        res.json(updatedMachinery);
    } catch (err) {
        next(err); 
    }
});


app.get('/machinery/new', requireLogin, checkMerchant, (req, res) => {
    res.render('machinery/new');
})


app.post('/machinery', requireLogin, checkMerchant, upload.single('image'), validMachinery, catchAsync(async (req, res) => {
    req.body.image_url = req.file.path.replace('/upload', '/upload/w_500,h_300/q_auto/f_auto');
    req.body.seller_id = req.session.user_id;
    const insertId = await database.addMachinary(req.body);
    res.redirect(`/machinery/${insertId}`);
}))

app.get('/machinery/cart', requireLogin, catchAsync(async (req, res) => {
    const cart_id = await database.FindCart(req.session.user_id);
    const items = await database.FindCartItems(cart_id);
    console.log(items);
    res.render('machinery/cart', { items });
}))


app.get('/machinery/:id', catchAsync(async (req, res) => {
    const mach = await database.findOneMachinery(req.params.id);
    const reviews = await database.findReview(req.params.id);
    res.render('machinery/show', { mach, reviews });
}))


app.delete('/machinery/:id', requireLogin, isMerchant, catchAsync(async (req, res) => {
    await database.deleteMachinery(req.params.id);
    res.redirect(`/machinery`);
}))


app.post('/machinery/:id/reviews', requireLogin, catchAsync(async (req, res) => {
    await database.addReview(req);
    res.redirect(`/machinery/${req.params.id}`);
}))


app.delete('/machinery/:mach_id/review/:rev_id', requireLogin, catchAsync(async (req, res) => {
    await database.deleteReview(req.params.rev_id);
    res.redirect(`/machinery/${req.params.mach_id}`);
}))

app.post('/process_payment', requireLogin, catchAsync(async (req, res) => {
    const { delivery_address } = req.body;
    const userId = req.session.user_id;
    try {
        const cartId = await database.FindCart(userId);
        const cartItems = await database.FindCartItems(cartId);
        console.log("Cart Items:", cartItems);
        let totalAmount = 0;
        for (const item of cartItems) {
            const price = parseFloat(item.mach_price);
            totalAmount += price * item.quantity;
        }
        console.log("Total Amount:", totalAmount);
        const orderId = await database.createOrder(userId, totalAmount, delivery_address);
        for (const item of cartItems) {
            await database.addSoldMachinery(orderId, item.mach_id, item.seller_id, userId, parseFloat(item.mach_price),item.quantity);
            await database.removeCartItem(item.cart_item_id);
        }

        await database.clearCart(userId);

        console.log(`Order ${orderId} processed successfully`);
        res.status(200).send(`Order ${orderId} processed successfully`);
    } catch (error) {
        console.error('Error processing payment:', error);
        res.status(500).send('Error processing payment');
    }
}))
app.post('/machinery/:id/cart', requireLogin, catchAsync(async (req, res) => {
    console.log("add machinery");
    const catch_cartId = await redis.get(`${req.session.user_id}#cart`);
    if (!catch_cartId) {
        console.log("cache miss");
        var cart_id = await database.FindCart(req.session.user_id);
        await redis.set(`${req.session.user_id}#cart`, JSON.stringify(cart_id),"EX",600);
    } else {
        console.log("cache hit");
        var cart_id = JSON.parse(catch_cartId);
        console.log("cart id =", cart_id);
    }
    if(!await database.updateMachinery(req.params.id,req.body.quantity)){
        req.flash('error',`we don't have ${req.body.quantity} in stock`);
        return res.redirect(`/machinery/${req.params.id}`);
    }
    const insert_id = await database.addCartItem(cart_id, req.params.id, req.body.quantity);
    if (insert_id) {
        req.flash('success', 'Item Added to your Cart');
    } else {
        req.flash('error', 'Item Out Of Stock');
    }
    res.redirect(`/machinery/${req.params.id}`);
}));
app.delete('/cart/:mach_id',requireLogin,catchAsync(async(req,res)=>{
    try {
        const catch_cartId = await redis.get(`${req.session.user_id}#cart`);
        if (!catch_cartId) {
            console.log("cache miss");
            var cart_id = await database.FindCart(req.session.user_id);
            await redis.set(`${req.session.user_id}#cart`, JSON.stringify(cart_id),"EX",600);
        } else {
            console.log("cache hit");
            var cart_id = JSON.parse(catch_cartId);
        }
        await database.removeCartItem(cart_id,req.params.mach_id);
        res.status(200).json({
            no_of_item:1,
            deleted:"success"
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            status:"transation failed"
        });
    }
}))

app.get('/blogs', catchAsync(async (req, res) => {
    const posts = await database.FindAllBlog();
    res.render('blog/index', { posts });
}))

app.get('/blogs/new', requireLogin, catchAsync(async (req, res) => {
    res.render('blog/new');
}))

app.post('/blogs', requireLogin, upload.single('image'), validBlog, catchAsync(async (req, res) => {
    const image_url = req.file.path.replace('/upload', '/upload/w_500,h_300/q_auto/f_auto');
    const id = await database.AddBlog(image_url, req.body.content, req.body.title, req.session.user_id);
    res.redirect(`/blogs/${id}`);
}))

app.delete('/blog/:id', requireLogin, isBloger, catchAsync(async (req, res) => {
    const post = await database.deleteBlog(req.params.id);
    res.redirect('/blogs');
}))

app.get('/blogs/:id', requireLogin, catchAsync(async (req, res) => {
    const post = await database.FindBlog(req.params.id);
    const comments = await database.FindComment(req.params.id);
    console.log(comments);
    res.render('blog/blog', { post, comments });
}))

app.post('/blogs/:blog_id/comment', requireLogin, catchAsync(async (req, res) => {
    console.log(req.body);
    const comment = req.body;
    comment.blog_id = req.params.blog_id;
    comment.user_id = req.session.user_id;
    await database.addComment(comment);
    res.redirect('back');
}))

app.get('/payment', (req, res, next) => {
    if(req.query.for=="cart"){
        const cart=0;
    }
    res.render('payment/pay', { }, (err, html) => {
        if (err) {
            next(err);
        } else {
            res.send(html);
        }
    });
});




app.all('*', (req, res, next) => {
    next(new appError('page not found', 404))
});

app.use((err, req, res, next) => {
    const { statusCode = 500 } = err;
    if (!err.messaage) err.messaage = "Oh no somthing went wrong !!";
    res.status(statusCode).render('error', { err });
});


app.listen(port, () => {
    console.log(`listening at ${port}`);
});