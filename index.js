const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const jwt = require("jsonwebtoken");
// const dbConnect = require('./utils/dbConnect');
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();
const port = process.env.PORT || 5000;

// const servicesRoutes = require('./routes/services.route.js');

//middleware
app.use(cors());
app.use(express.json());
// app.use('/service', servicesRoutes);

// dbConnect();
// URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.nzql2.mongodb.net/?retryWrites=true&w=majority`;

// Client
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "UnAuthorized access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden Access" });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    await client.connect();
    const serviceCollection = client.db("auto_parts").collection("services");
    // connection for user order
    const orderCollection = client.db("auto_parts").collection("orders"); //post-steps(1)
    const reviewCollection = client.db("auto_parts").collection("reviews");
    const userCollection = client.db("auto_parts").collection("users");
    const paymentCollection = client.db("auto_parts").collection("payments");

    // api for insert all services data
    app.post("/service", async (req, res) => {
      const product = req.body;
      // console.log(product);
      const result = await serviceCollection.insertOne(product);
      res.send(result);
    });

    // api for get all services data
    app.get("/service", async (req, res) => {
      const query = {};
      const cursor = serviceCollection.find(query);
      services = await cursor.toArray();
      res.send(services);
    });

    // api for load all user into makeAdmin page
    app.get("/user", verifyJWT, async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    });

    // api for load all review
    app.get("/review", async (req, res) => {
      const review = await reviewCollection.find().toArray();
      res.send(review);
    });

    // api for admin route
    app.get("/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      const isAdmin = user.role === "admin";
      res.send({ admin: isAdmin });
    });

    // api for user admin role//
    app.put("/user/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      // verify admin
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({
        email: requester,
      });
      if (requesterAccount.role === "admin") {
        const filter = { email: email };
        const updateDoc = {
          $set: { role: "admin" },
        };
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result);
      } else {
        res.status(403).send({ message: "Forbidden" });
      }
    });

    ///

    // // api for update & store user profile data
    // app.put('/user/:email', async (req, res) => {
    //   const email = req.params.email;
    //   const user = req.body;
    //   const filter = { email: email };
    //   const options = { upsert: true };
    //   const updatedDoc = {
    //     $set: user,
    //   };
    //   const result = await userCollection.updateOne(
    //     filter,
    //     updatedDoc,
    //     options
    //   );
    //   res.send(result);
    // });

    ///

    // // api for load update user data
    // app.get('/user/:email', async (req, res) => {
    //   const email = req.params.email;
    //   const user = await userCollection.findOne({
    //     email: email,
    //   });
    //   res.send(user);
    // });

    // api for getting all orders
    app.get("/manage", async (req, res) => {
      try {
        const orders = await orderCollection.find().toArray();
        res.send(orders);
      } catch (error) {
        res.send(error.message);
      }
    });

    // api for updating pending to shift
    app.put("/manage/:id", async (req, res) => {
      try {
        const id = req.params.id;
        // const updatedValue = req.body;
        const filter = { _id: ObjectId(id) };
        const options = { upsert: true };
        const updateDoc = {
          $set: { status: req.body.status },
        };
        const result = await orderCollection.updateOne(
          filter,
          updateDoc,
          options
        );
        res.send(result);
      } catch (error) {
        // console.log(error)
        res.send(error);
      }
    });

    // api for payment
    app.post("/create-payment-intent", verifyJWT, async (req, res) => {
      const service = req.body;
      const price = service.price;
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      console.log(paymentIntent);
      res.send({ clientSecret: paymentIntent.client_secret });
    });

    // api for insert user login information to database
    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      console.log(email);
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign(
        { email: email },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "1d" }
      );
      res.send({ result, token });
    });

    // api for see single item info
    app.get("/service/:id", async (req, res) => {
      const result = await serviceCollection.findOne({
        _id: ObjectId(req.params.id),
      });
      res.send(result);
    });

    // api for show specific user orders
    app.get("/order", verifyJWT, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;
      if (email === decodedEmail) {
        const query = { email: email };
        const orders = await orderCollection.find(query).toArray();
        return res.send(orders);
      } else {
        return res.status(403).send({ message: "Forbidden Access" });
      }
    });

    // api for delete order
    app.delete("/order/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await orderCollection.deleteOne(query);
      res.send(result);
    });

    // api for delete order
    app.delete("/service/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await serviceCollection.deleteOne(filter);
      res.send(result);
    });
    // api for delete user
    app.delete("/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await userCollection.deleteOne(filter);
      res.send(result);
    });

    // api for update payment info
    app.patch("/order/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const payment = req.body;
      const filter = { _id: ObjectId(id) };
      const updatedDoc = {
        $set: {
          paid: true,
          transactionId: payment.transactionId,
        },
      };
      const result = await paymentCollection.insertOne(payment);
      const updatedOrder = await orderCollection.updateOne(filter, updatedDoc);
      res.send(updatedDoc);
    });

    // api for display data by id // for pay button click
    app.get("/order/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const order = await orderCollection.findOne(query);
      res.send(order);
    });

    // api for insert user review to database
    app.post("/review", async (req, res) => {
      const review = req.body;
      const result = await reviewCollection.insertOne(review);
      res.send(result);
    });

    // api for insert user orders data to database == //post-steps(2)
    app.post("/order", async (req, res) => {
      const order = req.body;
      const result = await orderCollection.insertOne(order);
      res.send(result);
    });
  } finally {
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello from Online Parts store!");
});

app.listen(port, () => {
  console.log(`Parts store app listening on port ${port}`);
});
