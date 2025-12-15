const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: ['like', 'dislike']
    },
    comment: {
        type: String,
        trim: true
    },
    employeeId: {
        type: String,
        default: 'unknown'
    },
    clientId: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Feedback', feedbackSchema);
