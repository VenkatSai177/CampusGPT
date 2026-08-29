import { Request, Response, NextFunction } from 'express';
import { RAGService } from '../services/rag.service';
import { ConversationModel } from '../models/conversation.model';
import { MessageModel } from '../models/message.model';
import { AppError } from '../utils/appError';

export const chatQueryController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError('Authentication required.', 401);

    const { query, conversation_id } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      throw new AppError('Please provide a valid question in the "query" field.', 400);
    }

    const trimmedQuery = query.trim();
    let targetConversationId = conversation_id;

    // 1. Validate or auto-create conversation
    if (targetConversationId) {
      const existingConv = await ConversationModel.findByIdAndUser(targetConversationId, userId);
      if (!existingConv) {
        throw new AppError('Conversation not found or access denied.', 404);
      }
    } else {
      // Auto-generate title from query snippet
      const generatedTitle = trimmedQuery.length > 35 ? `${trimmedQuery.substring(0, 35)}...` : trimmedQuery;
      const newConv = await ConversationModel.create(userId, generatedTitle);
      targetConversationId = newConv.id;
    }

    // 2. Execute RAG Pipeline (Phases 3 & 4)
    const ragResult = await RAGService.processQuery(trimmedQuery);

    // 3. Persist Messages (User query + Assistant response)
    const userMsg = await MessageModel.create(targetConversationId, 'user', trimmedQuery, []);
    const assistantMsg = await MessageModel.create(
      targetConversationId,
      'assistant',
      ragResult.answer,
      ragResult.sources || []
    );

    // 4. Return Phase 4/5 compatible payload
    res.status(200).json({
      success: true,
      conversation_id: targetConversationId,
      user_message_id: userMsg.id,
      assistant_message_id: assistantMsg.id,
      ...ragResult,
    });
  } catch (error) {
    next(error);
  }
};
