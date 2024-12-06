import { Conversation as conversationModel } from "../models/conversationModel.js";
import { User as userModel } from "../models/userModel.js";
import { Message as messageModel } from "../models/messageModel.js";
import mongoose from "mongoose";;

export const fetchConversation = async (req, res) => {
  const userId = req.user._id; // Assuming req.user has the user's information
  try {
    const conversations = await conversationModel
      .find({ participants: userId })
      .populate("participants", "username avatar status _id email")
      .populate("lastMessage", "_id content timestamp")
      .sort({ updatedAt: -1 });

    const formattedConversations = conversations.map((conversation) => {
      const participant = conversation.participants.find(
        (participant) => !participant._id.equals(userId)
      );

      return {
        _id: conversation._id,
        lastMessage: {
          _id: conversation.lastMessage?._id,
          content: conversation.lastMessage?.content,
          timestamp: conversation.lastMessage?.timestamp,
        },
        user: participant,
        updatedAt: conversation.updatedAt,
      };
    });

    return res.status(200).json(formattedConversations);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return res.status(500).json({ error: "Error fetching conversations" });
  }
};

export const fetchMessages = async (req, res) => {
  try {

    const conversationId = req.params.conversationId;
    const objectId = new mongoose.Types.ObjectId(conversationId);
    const conversation = await conversationModel.findById(objectId);
    const messages = await messageModel.find({
      conversation: conversation._id,
    });
    if (messages.length === 0) {
      return res.status(200).json({ message: "Messages not found" });
    }
    return res.status(200).json(messages);
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Failed to fetch messages", details: error.message });
  }
};

export const fetchUsers = async (req, res) => {
  try {
    const user = req.user;
    const searchQuery = req.query.search || "";
    
    const users = await userModel
      .find({
        _id: { $ne: user._id },
        username: { $regex: searchQuery, $options: "i" } // Use regex to perform a case-insensitive search
      })
      .select("username _id status email avatar");
    
    return res.status(200).json(users);
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Failed to fetch users", details: error.message });
  }
};

export const fetchRecipient = async (req, res) => {
  const recipientId = req.body.recipient;
  try {
    const user = await userModel.findById(recipientId);
    return res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};



