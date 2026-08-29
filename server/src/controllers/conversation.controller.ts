import { Request, Response, NextFunction } from 'express';
import { ConversationModel } from '../models/conversation.model';
import { MessageModel } from '../models/message.model';
import { AppError } from '../utils/appError';

export const createConversationController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError('Authentication required.', 401);

    const { title } = req.body;
    const conversation = await ConversationModel.create(userId, title || 'New Conversation');

    res.status(201).json({
      success: true,
      conversation,
    });
  } catch (error) {
    next(error);
  }
};

export const getConversationsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError('Authentication required.', 401);

    const conversations = await ConversationModel.listByUser(userId);

    res.status(200).json({
      success: true,
      conversations,
    });
  } catch (error) {
    next(error);
  }
};

export const getConversationByIdController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const id = req.params.id as string;

    if (!userId) throw new AppError('Authentication required.', 401);

    const conversation = await ConversationModel.findByIdAndUser(id, userId);
    if (!conversation) {
      throw new AppError('Conversation not found or access denied.', 404);
    }

    const messages = await MessageModel.listByConversation(id);

    res.status(200).json({
      success: true,
      conversation,
      messages,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteConversationController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const id = req.params.id as string;

    if (!userId) throw new AppError('Authentication required.', 401);

    const success = await ConversationModel.delete(id, userId);
    if (!success) {
      throw new AppError('Conversation not found or access denied.', 404);
    }

    res.status(200).json({
      success: true,
      message: 'Conversation deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const updateMessageFeedbackController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const id = req.params.id as string;
    const { feedback } = req.body;

    if (!userId) throw new AppError('Authentication required.', 401);

    if (feedback !== 'like' && feedback !== 'dislike' && feedback !== null) {
      throw new AppError('Feedback must be "like", "dislike", or null.', 400);
    }

    // 1. Verify message exists
    const message = await MessageModel.findById(id);
    if (!message) {
      throw new AppError('Message not found.', 404);
    }

    // 2. Verify conversation ownership
    const conversation = await ConversationModel.findByIdAndUser(message.conversation_id, userId);
    if (!conversation) {
      throw new AppError('Access denied: You do not own this conversation message.', 403);
    }

    // 3. Update feedback
    const updatedMessage = await MessageModel.updateFeedback(id, feedback);

    res.status(200).json({
      success: true,
      message: updatedMessage,
    });
  } catch (error) {
    next(error);
  }
};
