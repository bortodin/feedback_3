const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from 'public' directory

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('Connected to MongoDB');
        // Start server only after successful DB connection
        if (require.main === module) {
            app.listen(PORT, () => {
                console.log(`Server is running on port ${PORT}`);
            });
        }
    })
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });

// Routes
const feedbackRoutes = require('./routes/feedback');
app.use('/api/feedback', feedbackRoutes);

module.exports = app;
