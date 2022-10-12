const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const messageSchema = new Schema(
    {
        cid: {
            type: Schema.Types.ObjectId,
            ref: "Chat",
        },
        message: { type: Schema.Types.String },
        sender: { type: Schema.Types.ObjectId, ref: "User" },
        user1Deleted: { type: Boolean },
        user2Deleted: { type: Boolean },
    },
    { timestamps: true },
);

module.exports = mongoose.model("Message", messageSchema);
