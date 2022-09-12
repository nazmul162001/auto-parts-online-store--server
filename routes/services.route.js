const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  const query = {};
  const cursor = serviceCollection.find(query);
  services = await cursor.toArray();
  res.send(services);
});
router.get('/:id', async (req, res) => {
  const result = await serviceCollection.findOne({
    _id: ObjectId(req.params.id),
  });
  res.send(result);
});
router.post('/', async (req, res) => {
  const product = req.body;
  // console.log(product);
  const result = await serviceCollection.insertOne(product);
  res.send(result);
});
router.delete('/:id', async (req, res) => {
  const id = req.params.id;
  const filter = { _id: ObjectId(id) };
  const result = await serviceCollection.deleteOne(filter);
  res.send(result);
});

// router.route("/").get((req,res)=> {
  
// })

module.exports = router;
