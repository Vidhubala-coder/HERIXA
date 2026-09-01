import { Router } from 'express';
import { askQuestionAboutMonument, chatWithHeritageAssistant, getAssistantHealth } from '../controllers/assistantController';

const router = Router();

router.get('/health', getAssistantHealth);
router.post('/ask', askQuestionAboutMonument);
router.post('/chat', chatWithHeritageAssistant);

export default router;
