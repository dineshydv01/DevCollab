// WHAT: A single persisted chat message. This is the permanent record
//       — Socket.IO only ever DELIVERS messages in real time; MongoDB
//       is what makes chat history survive a page refresh, a server
//       restart, or someone joining the project after the conversation
//       already started (spec section 21/50's "Socket.IO is not
//       persistent storage" principle).
// WHY readBy lives on the message itself: it's the simplest correct
//      way to answer "has this specific user seen this specific
//      message?" — a query like
//      Message.countDocuments({ project, sender: {$ne: userId}, readBy: {$ne: userId} })
//      directly answers "how many unread messages does this user have
//      in this project?" without a separate read-receipts collection.

import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: [true, "Message content is required"],
      trim: true,
      minlength: 1,
      maxlength: 2000,
    },
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

// Supports the two dominant queries: "give me this project's chat
// history, newest first" and (implicitly, via the same compound shape)
// unread-count lookups scoped to one project.
messageSchema.index({ project: 1, createdAt: -1 });

messageSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

export const Message = mongoose.model("Message", messageSchema);
