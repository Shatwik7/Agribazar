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


app.get('/api/user-count', catchAsync(async (req, res) => {
    const userCount = await database.countUser();
    res.json({ count: userCount });
}));

app.get('/api/product-count', catchAsync(async (req, res) => {
    const productCount = await database.countProduct();
    res.json({ count: productCount });
}));


app.get('/api/products', async (req, res) => {
    
    const { sort = '', search = '', page = 1, limit = 12 } = req.query;
    const offset = (page - 1) * limit;
    const key=`product#${sort}#${search}#${page}`;
    const cachedData = await redis.get(key);
    if(cachedData){
        return res.json(JSON.parse(cachedData));
    }
    console.log(search,sort,limit,offset);
    const {products,totalCount}= await database.SearchAndSortProducts(search,sort,limit,offset);
    const data={
        products,
        totalPages: Math.ceil(totalCount/ limit)
    };
    await redis.set(key, JSON.stringify(data), 'EX', 120);
    res.json(data);
});


app.get('/product', catchAsync(async (req, res) => {
    res.render('product/show');
}))

app.get('/product/map/data', catchAsync(async (req, res) => {
    const acceptHeader = req.headers.accept || "";
    try {
        const cachedData = await redis.get('products_map_data');
        if (cachedData) {
            return res.json(JSON.parse(cachedData));
        }

        const products = await database.FindAllProduct();
        const objectsWithGeometry = products.map(obj => {
            const { lng, lat, product_id, product_name, image_url, description, starting_price, ...rest } = obj;
            return {
                geometry: {
                    type: "Point",
                    coordinates: [lng, lat]
                },
                properties: {
                    product_id: product_id,
                    product_name: product_name,
                    product_card: `
                        <div class="center">
                            <div class="article-card">
                                <div class="close-btn">&times;</div>
                                <a href="/product/${product_id}">
                                    <div class="content">
                                        <p class="date">$${starting_price}</p>
                                        <p class="title">${product_name}</p>
                                    </div>
                                    <img src="${image_url}" alt="article-cover"/>
                                </a>
                            </div>
                        </div>
                        `
                }
            };
        });

        await redis.set('products_map_data', JSON.stringify(objectsWithGeometry), 'EX', 300);
        return res.json(objectsWithGeometry);
    } catch (error) {
        console.error('Error fetching or caching data:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}));

app.get('/product/map', catchAsync(async (req, res) => {
    res.render('product/map');
}));

app.post('/product/map/data', validMapSearch, catchAsync(async (req, res) => {
    try {
        const addressKey = `geo#${req.body.address}`;
        const productsKey = `products#${req.body.address}#${req.body.radius}`;
        const geometryKey = `geometry#${req.body.address}#${req.body.radius}`;
        let geoData = await redis.get(addressKey);
        let coordinates;
        if (!geoData) {
            const geoResponse = await geocoder.forwardGeocode({
                query: `${req.body.address}`,
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
        let cachedProducts = await redis.get(productsKey);
        let products;
        if (cachedProducts) {
            products = JSON.parse(cachedProducts);
        } else {
            products = await database.findProductNearest(lng, lat, req.body.radius * 1000);
            if (!products.length) {
                return res.status(404).json({ error: 'No products found within the specified radius' });
            }
            await redis.set(productsKey, JSON.stringify(products), 'EX', 600);
        }
        let cachedObjectsWithGeometry = await redis.get(geometryKey);
        let objectsWithGeometry;
        if (cachedObjectsWithGeometry) {
            objectsWithGeometry = JSON.parse(cachedObjectsWithGeometry);
        } else {
            objectsWithGeometry = products.map(obj => {
                const { lng, lat, product_id, product_name, image_url, description, starting_price, ...rest } = obj;
                return {
                    geometry: {
                        type: "Point",
                        coordinates: [lng, lat]
                    },
                    properties: {
                        product_id,
                        product_name,
                        product_card: `
                            <div class="center">
                            <div class="article-card">
                                <div class="close-btn">&times;</div>
                                <a href="/product/${product_id}"><div class="content">
                                <p class="date">$${starting_price}</p>
                                <p class="title">${product_name}</p>
                                </div>
                                <img src="${image_url}" alt="article-cover"/>
                            </div></a>
                            </div>`
                    }
                };
            });
            await redis.set(geometryKey, JSON.stringify(objectsWithGeometry), 'EX', 600);
        }
        res.json({ objectsWithGeometry });
    } catch (error) {
        console.error('Error fetching geocode or products:', error);
        res.status(500).json({ error: 'Something went wrong, please try again' });
    }
}));



app.post('/product', requireLogin, checkFarmer, upload.single('image'), validProduct, catchAsync(async (req, res) => {
    req.body.image_url = req.file.path.replace('/upload', '/upload/w_500,h_400/q_auto/f_auto');
    const insertId = await database.addPoduct(req);
    await redis.del('products_map_data');
    res.redirect(`/product/${insertId}`);
}))


app.post('/bid/:id', requireLogin, validBid, catchAsync(async (req, res) => {
    console.log(req.body.amount);
    const bid = await database.AddBid(req);
    res.redirect(`/product/${req.params.id}`);
}))

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

app.get(`/user/soldproducts`, requireLogin, checkFarmer, catchAsync(async (req, res) => {
    const soldProducts = await database.findSoldProduct(req.session.user_id);
    console.log(soldProducts);
    res.render('user/sold', { soldProducts });
}))

app.get('/user/won', requireLogin, catchAsync(async (req, res) => {
    const products = await database.productBought(req.session.user_id);
    res.render('user/won', { products });
}))
app.get('/user/products', requireLogin, checkFarmer, (async (req, res) => {
    const products = await database.FindAllProductByUser(req.session.user_id);
    res.render('user/products', { products });
}))
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
app.get('/product/:id/bids',requireLogin,catchAsync(async(req,res)=>{
    const Id = req.params.id;
    try {
      const bids = await database.Bids(Id);
      res.status(400).json(bids);
    } catch (error) {
      res.status(500).send(error.message);
    }
}))

app.get('/product/:id/edit', requireLogin, isFarmer, catchAsync(async (req, res) => {
    const crop = await database.mspset();
    const product = await database.FindProduct(req.params.id);
    res.render('product/edit', { product, crop });
}))


app.delete('/product/:id', requireLogin, isFarmer, catchAsync(async (req, res) => {
    await database.deleteProduct(req.params.id);
    res.redirect('/product');
}));


app.put('/product/:id', requireLogin, isFarmer, upload.single('image'), catchAsync(async (req, res) => {
    console.log(req.body, req.file);
}))


app.get('/login', (req, res) => {
    res.render("user/login");
})


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


app.get('/register', (req, res) => {
    res.render('user/register');
})


app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/product');
})


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


app.get('/user/:id', requireLogin, catchAsync(async (req, res) => {
    const { id } = req.params;
    const user = await database.FindUserById(id);
    if(!user){
        return res.redirect('/product');
    }
    res.render('user/show', { user });
}))


app.delete('/user/:id', requireLogin, catchAsync(async (req, res) => {
    await database.deleteUser(req.params.id);
    req.session.destroy();
    res.redirect('/');
}))

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


app.post('/machinery/:id/cart', requireLogin, catchAsync(async (req, res) => {
    const cart_id = await database.FindCart(req.session.user_id);
    const insert_id = await database.addCartItem(cart_id, req.params.id, req.body.quantity);
    if (insert_id) {
        req.flash('success', 'Item Added to your Cart');
    }
    else {
        req.flash('error', 'Item Out Of Stock');
    }
    res.redirect(`/machinery/${req.params.id}`);
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

app.get('/payment', requireLogin, catchAsync((req, res) => {
    res.render('payment/pay');
}))



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