require('dotenv').config()
const express = require('express');
const cors = require('cors')
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const verifyToken = require('./middleware/firebaseToken');


//middleWare
app.use(cors());
app.use(express.json())


// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(process.env.MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
}); 

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    
    const booksCollection = client.db("booksDB").collection("books")
    const borrowsCollection = client.db("booksDB").collection("borrows")
    //get item and showed in client
  
    app.get("/books", async(req,res) =>{
      const allBooks = await booksCollection.find().toArray()
      res.send(allBooks)
    })
    
    //create clientconnection and post
    app.post("/add-book", verifyToken, async(req,res) =>{

      const bookData = req.body;
      const quantity = bookData.quantity;
      bookData.quantity = parseInt(quantity)
      const rating = bookData.rating;
      bookData.rating = parseInt(rating)
      const result = await booksCollection.insertOne(bookData)
      res.send(result)

    })
        //get a single Book by id

        app.get("/books/:id",async(req,res) =>{
          const id =req.params.id
          const query = {_id: new ObjectId(id)}
          const result = await booksCollection.findOne(query)
          res.send(result)
        })

        //update book
 
      app.put('/books/:id', verifyToken, async(req,res) =>{

        const id = req.params.id
        const filter = {_id: new ObjectId(id)}
        const updatedBook = req.body
        updatedBook.quantity = parseInt(updatedBook.quantity);
        updatedBook.rating = parseInt(updatedBook.rating);
        const updatedDoc ={
          $set: updatedBook
        }
        const result = await booksCollection.updateOne(filter,updatedDoc)
        res.send(result)
      })

      //category book
 app.get("/books/category/:categoryName",async(req,res) =>{

    const categoryName = req.params.categoryName.toLowerCase();

  const allBooks = await booksCollection.find().toArray();

  const filteredBooks = allBooks.filter(book =>
    book.category?.toLowerCase() === categoryName
  );

  res.send(filteredBooks);
});

      
//handle borrow
//save a borrow book data  in database through post request
app.post('/borrow-book/:bookId', verifyToken, async(req,res) =>{
  const id = req.params.bookId
  const borrowData = req.body
  const email = req.user.email;  
    const alreadyBorrowed = await borrowsCollection.findOne({
      bookId: borrowData.bookId,
      email,
    });

    // console.log(alreadyBorrowed)
    if (alreadyBorrowed) {
      return res.status(200).json({ message: "You have already borrowed this book.", status:true });
    }
  const result = await borrowsCollection.insertOne(borrowData)
  //update quantity from books collection
  if (result.acknowledged) {
    await booksCollection.updateOne(
    {_id:new ObjectId(id)},
    { $inc:{ quantity: -1 } }
    )
  }

  res.send(result)
})

// get all borrow books data by user email

app.get('/borrow-lists/:email',async(req,res) =>{
  const userEmail = req.params.email;
  const filter ={
    email: userEmail
  }
  const allBorrows = await borrowsCollection.find(filter).toArray()
  for (const borrow of allBorrows) {
        const borrowId = borrow.bookId
    const fullBorrowData = await booksCollection.findOne({
      _id: new ObjectId(borrowId)
    })
    borrow.name = fullBorrowData.name
    borrow.author = fullBorrowData.author
    borrow.quantity = fullBorrowData.quantity
    borrow.rating = fullBorrowData.rating
    borrow.image = fullBorrowData.image
    borrow.category = fullBorrowData.category
  }

  res.send(allBorrows)
})

//books remove
app.delete("/return-book/:id", verifyToken, async(req,res) =>{

  const id = req.params.id;
  const bookId =req.query.id;

   const result = await booksCollection.updateOne(
    {_id:new ObjectId(bookId)},
    {
    $inc:{
    quantity: 1,
    },
    }
    )

    const removeBook = await borrowsCollection.deleteOne({_id: new ObjectId(id)})
res.send({ updatedResult: result, deletedResult: removeBook });

})

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/',(req,res) =>{
    res.send("Books Nest cooking")
})

app.listen(port,() =>{
    console.log(`Books Nest server is running on port ${port}`)
})