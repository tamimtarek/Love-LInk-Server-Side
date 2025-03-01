const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;
require("dotenv").config();
// middleware

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://lovelink-36e1e.web.app",
      "https://lovelink-36e1e.firebaseapp.com",
    ]
  })
);
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.tvuzkq3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const bioDataCollection = client.db("lovelinkDB").collection("bioData");
    const userCollection = client.db("lovelinkDB").collection("users");
    const successStoryCollection = client.db("lovelinkDB").collection("success");
    const favouritesCollection = client.db("lovelinkDB").collection("favourites");
    const requestCollection = client.db("lovelinkDB").collection("request");

    // JWT Related API
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    const verifyToken = (req, res, next) => {
      console.log(req.headers);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorized Access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "unauthorized Access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    // User Collection

    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      console.log("inside Verify Token", req.headers.authorization);
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exists", insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.patch(
      "/users/admin/:id",
      verifyAdmin,
      verifyToken,
      async (req, res) => {
        const id = req.params.id;
        console.log(id);
        const filter = { _id: new ObjectId(id) };
        const updatedDoc = {
          $set: {
            role: "admin",
          },
        };
        const result = await userCollection.updateOne(filter, updatedDoc);
        res.send(result);
      }
    );

    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    // menu related APIS
    app.get("/bio", async (req, res) => {
      const result = await bioDataCollection.find().toArray();
      res.send(result);
    });
    app.get("/success", async (req, res) => {
      const result = await successStoryCollection.find().toArray();
      res.send(result);
    });

    app.get("/bio/:id", async (req, res)=>{
      const id = req.params.id
      const query = {_id: new ObjectId(id)}
      const result = await bioDataCollection.findOne(query);
      res.send(result);
    })
    
    

    app.post("/bio", async (req, res) => {
      const menuItme = req.body;
      const result = await bioDataCollection.insertOne(menuItme);
      res.send(result);
    });

    app.delete("/bio/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      
      const result = await bioDataCollection.deleteOne(query);
      console.log(result);
      res.send(result);
    });

    

    app.get("/story", async (req, res) => {
      const result = await successStoryCollection.find().toArray();
      res.send(result);
    });

    // favourites Collection
    app.get("/favourits", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await favouritesCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/favourits", async (req, res) => {
      const cartItem = req.body;
      const result = await favouritesCollection.insertOne(cartItem);
      res.send(result);
    });
    app.delete("/favourits/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await favouritesCollection.deleteOne(query);
      res.send(result);
    });
    // Contact Request Collection
    app.get("/request", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await requestCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/request", async (req, res) => {
      const cartItem = req.body;
      const result = await requestCollection.insertOne(cartItem);
      res.send(result);
    });
    app.delete("/request/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await requestCollection.deleteOne(query);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Your Pertner On the Server");
});
app.listen(port, () => {
  console.log(`Love Link Running on port ${port}`);
});
