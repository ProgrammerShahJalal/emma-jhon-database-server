const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
var admin = require("firebase-admin");
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// firebase admin initialization
var serviceAccount = require('./emma-jhon-simple-570a4-firebase-adminsdk-t04fz-228553c5e1.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

// middleware setup
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.tllgu.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function verifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith('Bearer ')) {
        const idToken = req.headers.authorization.split('Bearer ')[1];
        try {
            const decodedUser = await admin.auth().verifyIdToken(idToken);
            decodedUserEmail = decodedUser.email;
        }
        catch {

        }
    }
    next();
}

async function run() {
    try {
        await client.connect();
        const database = client.db('online_shop');
        const productCollection = database.collection('products');
        const orderCollection = database.collection('orders');

        // GET PRODUCT API
        app.get('/products', async (req, res) => {
            const cursor = productCollection.find({});

            const page = req.query.page;
            const size = parseInt(req.query.size);

            let products;
            const count = await cursor.count();
            if (page) {
                products = await cursor.skip(page * size).limit(size).toArray();
            }
            else {
                products = await cursor.toArray();
            }
            res.send({
                count,
                products
            });
        });
        // Use POST to get data by keys
        app.post('/products/byKeys', async (req, res) => {
            const keys = req.body;
            const query = { key: { $in: keys } }
            const products = await productCollection.find(query).toArray();
            res.json(products);
        });
        // add orders API according to specific email
        app.get('/orders', verifyToken, async (req, res) => {
            const email = req.query.email;
            if (decodedUserEmail === email) {
                const query = { email: email }
                const cursor = orderCollection.find(query);
                const orders = await cursor.toArray();
                console.log(orders);
                res.json(orders);
            }
            else {
                res.status(401).json({ message: 'User is not authorized' })
            }
        })
        // orders post api for send data to client site
        app.post('/orders', async (req, res) => {
            const order = req.body;
            order.createAt = new Date();
            const result = await orderCollection.insertOne(order);
            console.log("order", order);
            res.json(result);
        })
    }
    finally {
        // await client.close();
    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Running emma john server');
})
app.listen(port, () => {
    console.log('Server running on port:', port);
})