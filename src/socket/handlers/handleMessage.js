import { User as userModel } from "../../models/userModel.js";
import { Message as messageModel } from "../../models/messageModel.js";
import { Conversation as conversationModel } from "../../models/conversationModel.js";
import { onlineUsers } from "../socket.js";

export const handleMessage = (io, socket, decodedToken) => {
  socket.on("messageFromClient", async (message, callback) => {
    try {
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
          type:message.type,
        });

        await newMessage.save();

        conversation.messages.push(newMessage);
        conversation.lastMessage = newMessage._id;

        await conversation.save();

        const participant = conversation.participants.find(
          (participant) => !participant._id.equals(decodedToken.userId)
        );

        const senderSocketId = onlineUsers.get(sender._id.toString());
        const receiverSocketId = onlineUsers.get(receiver._id.toString());

        const updateDataForSender = {
          _id: conversation._id,
          lastMessage: {
            _id: conversation.lastMessage?._id,
            content: newMessage.content,
            timestamp: newMessage.timestamp,
          },
          user: {
            _id: receiver._id,
            username: receiver.username,
            avatar: receiver.avatar,
            status: receiver.status,
            email: receiver.email,
          },
          updatedAt: conversation.updatedAt,
        };

        const updateDataForReceiver = {
          _id: conversation._id,
          lastMessage: {
            _id: conversation.lastMessage?._id,
            content: newMessage.content,
            timestamp: newMessage.timestamp,
          },
          user: {
            _id: sender._id,
            username: sender.username,
            avatar: sender.avatar,
            status: sender.status,
            email: sender.email,
          },
          updatedAt: conversation.updatedAt,
        };

        if (senderSocketId)
          io.to(senderSocketId).emit("updateConversation", updateDataForSender);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit(
            "updateConversation",
            updateDataForReceiver
          );
          io.to(receiverSocketId).emit("receiveMessage", {
            ...newMessage.toObject(),
            tempId: message.tempId, // Include the tempId in the response
          });
        }

        callback({
          status: "ok",
          message: { ...newMessage.toObject(), tempId: message.tempId },
        });
      } else {
        console.log("Sender or receiver not found.");
        callback({ status: "error", error: "Sender or receiver not found." });
      }
    } catch (error) {
      console.error("Error handling message:", error);
      callback({ status: "error", error: "Error handling message." });
    }
  });

  socket.on("typing", (data) => {
    const { sender, receiver } = data;
    const receiverSocketId = onlineUsers.get(receiver);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("typing", { sender });
    }
  });
};
