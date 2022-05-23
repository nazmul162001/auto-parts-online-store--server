const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const cors = require('cors');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());

// URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.nzql2.mongodb.net/?retryWrites=true&w=majority`;

// Client
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});


async function run(){

  try{
    await client.connect();
    const serviceCollection = client.db('auto_parts').collection('services');

    app.get('/service', async(req,res)=> {
      const query = {};
      const cursor = serviceCollection.find(query);
      services = await cursor.toArray();
      res.send(services);
    })
  }
  finally{

  }
  
}

run().catch(console.dir)



app.get('/', (req, res) => {
  res.send('Hello from Online Parts store!');
});

app.listen(port, () => {
  console.log(`Parts store app listening on port ${port}`);
});
