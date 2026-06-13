import Message from './message.model.js';
import User from '../users/user.model.js';
import AppError from '../../shared/errors/AppError.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';

// Send a message
export const sendMessage = asyncHandler(async (req, res) => {
  const { receiverId, content, jobId } = req.body;
  const senderId = req.user._id;

  if (!receiverId || !content) {
    throw new AppError('Receiver ID and content are required', 400);
  }

  // Prevent sending messages to self
  if (senderId.toString() === receiverId.toString()) {
    throw new AppError('You cannot message yourself', 400);
  }

  // Verify receiver exists
  const receiver = await User.findById(receiverId);
  if (!receiver) {
    throw new AppError('Receiver not found', 404);
  }

  const message = await Message.create({
    senderId,
    receiverId,
    jobId,
    content
  });

  res.status(201).json(message);
});

// Get conversation with a specific user
export const getConversation = asyncHandler(async (req, res) => {
  const { userId } = req.params; // The other person's ID
  const myId = req.user._id;

  // Mark unread messages sent TO ME by this user as read
  await Message.updateMany(
    { senderId: userId, receiverId: myId, read: false },
    { $set: { read: true } }
  );

  const messages = await Message.find({
    $or: [
      { senderId: myId, receiverId: userId },
      { senderId: userId, receiverId: myId }
    ]
  }).sort('createdAt').lean();

  res.json({ data: messages });
});

// Get inbox (latest message per conversation)
export const getInbox = asyncHandler(async (req, res) => {
  const myId = req.user._id;

  // Aggregate to get latest message per unique contact
  const conversations = await Message.aggregate([
    {
      $match: {
        $or: [{ senderId: myId }, { receiverId: myId }]
      }
    },
    {
      $sort: { createdAt: -1 } // Sort by newest first
    },
    {
      $group: {
        _id: {
          $cond: [
            { $eq: ["$senderId", myId] },
            "$receiverId",
            "$senderId"
          ]
        },
        latestMessage: { $first: "$$ROOT" },
        unreadCount: {
          $sum: {
            $cond: [
              { $and: [{ $eq: ["$receiverId", myId] }, { $eq: ["$read", false] }] },
              1,
              0
            ]
          }
        }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'contact'
      }
    },
    {
      $unwind: '$contact'
    },
    {
      $project: {
        'contact.password': 0,
        'contact.__v': 0
      }
    },
    {
      $sort: { 'latestMessage.createdAt': -1 }
    }
  ]);

  res.json({ data: conversations });
});
