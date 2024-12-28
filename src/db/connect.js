import mongoose from "mongoose";
// import { User as userModel } from "../models/userModel.js";

const connectDb = async (uri) => {
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 30000, // Increase the server selection timeout
      socketTimeoutMS: 60000, // Increase the socket timeout
      connectTimeoutMS: 60000, // Increase the connection timeout
      maxPoolSize: 20, // Corrected casing for pool size
    });
    // await userModel.updateMany(
    //   {},
    //   {
    //     $unset: {
    //       friends: "",
    //       friendRequests: "",
    //       pendingRequests: "",
    //     },
    //   }
    // );
    console.log("Connected to MongoDB 💽");
  } catch (error) {
    console.error("Error connecting to the database: ", error.message);
    // Retry logic
    setTimeout(() => connectDb(uri), 5000); // Retry after 5 seconds
  }
};

export default connectDb;
