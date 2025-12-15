const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// POST - Submit feedback
router.post('/', async (req, res) => {
    try {
        const { type, comment, employeeId, clientId } = req.body;

        if (!clientId) {
            return res.status(400).json({ error: 'Client ID is required' });
        }

        // Check for existing feedback from this client in the last 60 minutes
        const sixtyMinutesAgo = new Date(Date.now() - 60 * 60 * 1000);
        const existingFeedback = await Feedback.findOne({
            clientId: clientId,
            createdAt: { $gt: sixtyMinutesAgo }
        });

        if (existingFeedback) {
            return res.status(429).json({ error: 'Ви вже залишили відгук. Спробуйте через годину.' });
        }

        const newFeedback = new Feedback({ type, comment, employeeId, clientId });
        await newFeedback.save();
        res.status(201).json({ message: 'Feedback submitted successfully' });
    } catch (error) {
        console.error('Error saving feedback:', error);
        res.status(500).json({ error: error.message });
    }
});



// POST - Analyze comments with AI
router.post('/analyze', async (req, res) => {
    try {
        const { employeeId, type } = req.body;

        if (!employeeId) {
            return res.status(400).json({ error: 'Employee ID is required' });
        }

        // Fetch comments
        let query = { employeeId: employeeId };

        // Add text filter: only analyze feedbacks with comments
        query.comment = { $exists: true, $ne: "" };

        // Filter based on type if needed for "positive" or "negative" specifically?
        // The user asked for "Positive comments analysis" -> we can filter by 'like'
        if (type === 'positive') {
            query.type = 'like';
        } else if (type === 'negative') {
            query.type = 'dislike';
        }
        // 'all' includes both

        const feedbacks = await Feedback.find(query);

        if (feedbacks.length === 0) {
            return res.json({ analysis: "Немає коментарів для аналізу." });
        }

        const commentsText = feedbacks.map(f => `- ${f.comment}`).join('\n');

        let prompt = "";
        if (type === 'all') {
            prompt = `Проаналізуй наступні відгуки про працівника. 
            Кожний відгук починається з тире.
            
            Відгуки:
            ${commentsText}
            
            Будь ласка, надайте відповідь українською мовою у такому форматі:
            1. **Загальний підсумок (Summary)**
            2. **Список сильних сторін**
            3. **Список слабких сторін**
            4. **Поради для покращення**`;
        } else if (type === 'positive') {
            prompt = `Проаналізуй наступні позитивні відгуки про працівника.
            
            Відгуки:
            ${commentsText}
            
            Надай тільки **Загальний підсумок (Summary)** українською мовою.`;
        } else if (type === 'negative') {
            prompt = `Проаналізуй наступні негативні відгуки про працівника.
            
            Відгуки:
            ${commentsText}
            
            Надай тільки **Загальний підсумок (Summary)** українською мовою.`;
        } else {
            return res.status(400).json({ error: 'Invalid analysis type' });
        }

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        res.json({ analysis: text });

    } catch (error) {
        console.error('AI Analysis Error:', error);
        res.status(500).json({ error: 'AI Analysis failed: ' + error.message });
    }
});

// GET - Get all feedback (for admin)
router.get('/', async (req, res) => {
    try {
        const feedbacks = await Feedback.find().sort({ createdAt: -1 });
        res.json(feedbacks);
    } catch (error) {
        console.error('Error fetching feedback:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
