import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Monument from '../models/monument';
import { askAssistant } from '../services/assistantService';

export const askQuestionAboutMonument = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  console.log('[HERIXA-AI] REQUEST_STARTED');
  try {
    const { monumentId, question, language, explainSimply, history } = req.body;

    // 1. Validate inputs
    if (!monumentId || typeof monumentId !== 'string' || monumentId.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: 'Missing or invalid required parameter: monumentId',
      });
      console.log('[HERIXA-AI] REQUEST_COMPLETED');
      return;
    }

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: 'Missing or invalid required parameter: question',
      });
      console.log('[HERIXA-AI] REQUEST_COMPLETED');
      return;
    }

    const trimmedQuestion = question.trim();
    if (trimmedQuestion.length > 500) {
      res.status(400).json({
        success: false,
        message: 'Question is too long (maximum 500 characters)',
      });
      console.log('[HERIXA-AI] REQUEST_COMPLETED');
      return;
    }

    const validLanguages = ['en', 'ta', 'hi', 'te', 'ml', 'kn'];
    if (!language || !validLanguages.includes(language)) {
      res.status(400).json({
        success: false,
        message: `Missing or invalid language parameter. Supported values: ${validLanguages.join(', ')}`,
      });
      console.log('[HERIXA-AI] REQUEST_COMPLETED');
      return;
    }

    if (explainSimply === undefined || typeof explainSimply !== 'boolean') {
      res.status(400).json({
        success: false,
        message: 'Missing or invalid parameter: explainSimply must be a boolean value',
      });
      console.log('[HERIXA-AI] REQUEST_COMPLETED');
      return;
    }

    if (history !== undefined && !Array.isArray(history)) {
      res.status(400).json({
        success: false,
        message: 'Invalid parameter: history must be an array of chat turns',
      });
      console.log('[HERIXA-AI] REQUEST_COMPLETED');
      return;
    }

    // 2. Fetch monument details
    let monument = null;
    if (mongoose.Types.ObjectId.isValid(monumentId)) {
      monument = await Monument.findById(monumentId);
    } else {
      monument = await Monument.findOne({ slug: monumentId });
    }

    if (!monument) {
      res.status(404).json({
        success: false,
        message: `Monument not found with identifier: '${monumentId}'`,
      });
      console.log('[HERIXA-AI] REQUEST_COMPLETED');
      return;
    }

    // 3. Ask assistant service
    const result = await askAssistant({
      monument,
      question: trimmedQuestion,
      language: language as 'en' | 'ta' | 'hi' | 'te' | 'ml' | 'kn',
      explainSimply,
      history: history || [],
    });

    res.status(200).json(result);
    console.log('[HERIXA-AI] REQUEST_COMPLETED');
  } catch (error) {
    console.log('[HERIXA-AI] ERROR');
    next(error);
  }
};
