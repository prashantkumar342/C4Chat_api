import mongoose, { mongo } from "mongoose";

const connectDb = (uri) => {
  try {
    mongoose.connect(uri);
    console.log("Connected to MongoDB 💽");
  } catch (error) {
    res.status(500).json("Error in connection the database: ", error.message);
  }
};

export default connectDb;
