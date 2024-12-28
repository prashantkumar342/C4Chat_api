import { Server } from "socket.io";
import cookie from "cookie";
import jwt from "jsonwebtoken";
import { User as userModel } from "../models/userModel.js"; // Ensure this is correctly imported
import { Message as messageModel } from "../models/messageModel.js";
import { handleMessage } from "./handlers/handleMessage.js";
import { handleFriends, watchProfile } from "./handlers/friendRequest.js";

export const onlineUsers = new Map();

const socketIoServer = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      credentials: true,
    },
  });

  io.on("connection", async (socket) => {
    const cookies = cookie.parse(socket.handshake.headers.cookie || "");
    if (!cookies.refToken) {
      socket.disconnect(true);
      return;
    }
    let decodedToken;
    try {
      decodedToken = jwt.verify(cookies.refToken, process.env.JWT_SECRET);
    } catch (error) {
      socket.disconnect(true);
      return;
    }
    onlineUsers.set(decodedToken.userId, socket.id);

    try {
      const liveUser = await userModel.findByIdAndUpdate(
        decodedToken.userId,
        {
          status: "online",
        },
        { new: true }
      );

      io.emit("onStatus", { user: liveUser.username, onlineStatus: "online" });

      const pendingMessages = await messageModel.find({
        receiver: decodedToken.userId,
        status: "pending",
      });

      pendingMessages.forEach(async (msg) => {
        io.to(socket.id).emit("receiveMessage", msg);
        msg.status = "sent";
        await msg.save();
      });

      handleMessage(io, socket, decodedToken);
      handleFriends(io, socket, decodedToken);
      watchProfile(io);
    } catch (error) {
      console.error("Error during user connection handling:", error);
    }

    socket.on("disconnect", async () => {
      onlineUsers.delete(decodedToken.userId.toString());
      try {
        const offlineUser = await userModel.findByIdAndUpdate(
          decodedToken.userId,
          {
            status: "offline",
          },
          { new: true }
        );

        io.emit("onStatus", {
          user: offlineUser.username,
          onlineStatus: "offline",
        });
      } catch (error) {
        console.error("Error during user disconnection handling:", error);
      }
    });
  });
};

export default socketIoServer;
