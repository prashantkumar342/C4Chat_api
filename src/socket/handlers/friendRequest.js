import mongoose from "mongoose";
import { User as userModel } from "../../models/userModel.js";
import { FriendRequest as friendRequestModel } from "../../models/friendrequestModel.js";
import { onlineUsers } from "../socket.js";

// Set up change stream for user profile updates
export const watchProfile = (io) => {
  const userChangeStream = userModel.watch();

  userChangeStream.on("change", async (change) => {
    try {
      if (
        change.operationType === "update" ||
        change.operationType === "replace"
      ) {
        const userId = change.documentKey._id;
        const updatedUser = await userModel.findById(userId).lean();
        const userSocketId = onlineUsers.get(userId.toString());

        if (userSocketId) {
          io.to(userSocketId).emit("updateProfile", updatedUser);
        }
      }
    } catch (error) {
      console.error("Error handling profile update:", error);
    }
  });
};

export const handleFriends = (io, socket) => {
  // Listen for friend requests
  socket.on("friendRequest", async (data) => {
    const { from: sender, to: receiver } = data;

    try {
      // Check for existing requests in the database
      const request = await friendRequestModel.findOne({
        $or: [
          { requester: sender, recipient: receiver },
          { requester: receiver, recipient: sender },
        ],
      });

      if (request) return;

      // Create a new friend request
      const newRequest = new friendRequestModel({
        requester: sender,
        recipient: receiver,
      });
      await newRequest.save();

      // Populate the requester and recipient fields
      const populatedRequest = await friendRequestModel
        .findById(newRequest._id)
        .populate("requester recipient", "username email avatar");

      // Update the receiver's and sender's friend request fields
      await Promise.all([
        userModel.findByIdAndUpdate(receiver, {
          $push: { friendRequests: sender },
        }),
        userModel.findByIdAndUpdate(sender, {
          $push: { pendingRequests: receiver },
        }),
      ]);

      const receiverSocketId = onlineUsers.get(receiver);
      if (receiverSocketId) {
        // Emit the populated friend request to the receiver if they are online
        io.to(receiverSocketId).emit("newFriendRequest", populatedRequest);
      }
    } catch (error) {
      console.error("Error handling friend request:", error);
    }
  });

  socket.on("acceptRequest", async (reqId) => {
    try {
      const request = await friendRequestModel.findById(reqId);
      if (!request) return;

      //remove the request from friend request and pending requests
      await Promise.all([
        userModel.findByIdAndUpdate(request.recipient, {
          $pull: { friendRequests: request.requester },
          $push: { friends: request.requester },
        }),
        userModel.findByIdAndUpdate(request.requester, {
          $pull: { pendingRequests: request.recipient },
          $push: { friends: request.recipient },
        }),
        friendRequestModel.findByIdAndDelete(reqId),
      ]);

      const recipientSocketId = onlineUsers.get(request.recipient.toString());
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("friendRequestAccepted", reqId);
      }
    } catch (error) {
      console.error("Error handling accept request:", error);
    }
  });

  socket.on("declineRequest", async (reqId) => {
    try {
      const request = await friendRequestModel.findById(reqId);
      if (!request) return;

      //remove the request from friend request and pending requests
      await Promise.all([
        userModel.findByIdAndUpdate(request.recipient, {
          $pull: { friendRequests: request.requester },
        }),
        userModel.findByIdAndUpdate(request.requester, {
          $pull: { pendingRequests: request.recipient },
        }),
        friendRequestModel.findByIdAndDelete(reqId),
      ]);

      const recipientSocketId = onlineUsers.get(request.recipient.toString());
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("friendRequestDeclined", reqId);
      }
    } catch (error) {
      console.error("Error handling decline request:", error);
    }
  });

  socket.on("acceptRequestFromUsers", async (data) => {
    const { sender, receiver } = data;
    console.log(data);
    try {
      const request = await friendRequestModel.findOne({
        requester: sender,
        recipient: receiver,
      });
      if (!request) return;

      //remove the request from friend request and pending requests
      await Promise.all([
        userModel.findByIdAndUpdate(request.recipient, {
          $pull: { friendRequests: request.requester },
          $push: { friends: request.requester },
        }),
        userModel.findByIdAndUpdate(request.requester, {
          $pull: { pendingRequests: request.recipient },
          $push: { friends: request.recipient },
        }),
        friendRequestModel.findByIdAndDelete(request._id),
      ]);

      const recipientSocketId = onlineUsers.get(request.recipient.toString());
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("friendRequestAccepted", request._id);
      }
    } catch (error) {
      console.error("Error handling accept request:", error);
    }
  });

  socket.on("removeFriend", async (data) => {
    const { friend, wantToRemove } = data;
    try {
      const findFriend = await userModel.findById(friend);
      const removerFriend = await userModel.findById(wantToRemove);
      if (!findFriend || !removerFriend) return;
      const reverseRequest = new friendRequestModel({
        requester: friend,
        recipient: wantToRemove,
      });
      await reverseRequest.save();
      await Promise.all([
        userModel.findByIdAndUpdate(friend, {
          $pull: { friends: wantToRemove },
          $push: { pendingRequests: wantToRemove },
        }),
        userModel.findByIdAndUpdate(wantToRemove, {
          $pull: { friends: friend },
          $push: { friendRequests: friend },
        }),
      ]);
    } catch (error) {
      console.error("Error removing friend", error);
    }
  });
};
