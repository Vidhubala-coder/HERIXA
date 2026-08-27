import { Router } from 'express';
import { askQuestionAboutMonument } from '../controllers/assistantController';

const router = Router();

router.post('/ask', askQuestionAboutMonument);

export default router;
