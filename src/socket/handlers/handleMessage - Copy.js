import { User as userModel } from "../../models/userModel.js";
import { Message as messageModel } from "../../models/messageModel.js";
import { Conversation as conversationModel } from "../../models/conversationModel.js";
import { onlineUsers } from "../socket.js";

export const handleMessage = (io, socket, decodedToken) => {
  socket.on("messageFromClient", async (message) => {
    const sender = await userModel.findById(decodedToken.userId);
    const receiver = await userModel.findById(message.receiver);
    if (sender && receiver) {
      let conversation = await conversationModel.findOne({
        participants: { $all: [sender._id, receiver._id] },
      });

      if (!conversation) {
        conversation = new conversationModel({
          participants: [sender._id, receiver._id],
        });

        await conversation.save();
      }

      const newMessage = new messageModel({
        content: message.content,
        sender: decodedToken.userId,
        receiver: message.receiver,
        conversation: conversation._id,
      });
      await newMessage.save();
      conversation.messages.push(newMessage);
      conversation.lastMessage = newMessage._id;
      await conversation.save();
      
      io.emit("updateConversation", {
        conversationId: newMessage.conversation,
        lastMessage: newMessage,
      });
      const senderSocketId = onlineUsers.get(sender._id.toString());
      const receiverSocketId = onlineUsers.get(receiver._id.toString());

      if (senderSocketId) {
        io.to(senderSocketId).emit("receiveMessage", newMessage);
      }
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("receiveMessage", newMessage);
        newMessage.status = "sent";
        await newMessage.save();
      }
    } else {
      console.log("Sender or receiver not found.");
    }
  }); // Listening for incoming messages
};
