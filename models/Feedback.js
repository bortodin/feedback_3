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

// Post-save hook to keep only 100 most recent records PER employee
feedbackSchema.post('save', async function (doc) {
    try {
        const Feedback = mongoose.model('Feedback');
        const limit = 100;

        // Count feedbacks for this specific employee
        const count = await Feedback.countDocuments({ employeeId: doc.employeeId });

        if (count > limit) {
            // Find the older documents that exceed the limit
            const toDelete = await Feedback.find({ employeeId: doc.employeeId })
                .sort({ createdAt: -1 }) // Newest first
                .skip(limit) // Skip the first 100 newest
                .select('_id'); // Only get the IDs

            if (toDelete.length > 0) {
                const idsToDelete = toDelete.map(d => d._id);
                await Feedback.deleteMany({ _id: { $in: idsToDelete } });
                console.log(`Deleted ${toDelete.length} old feedback records for employee: ${doc.employeeId}`);
            }
        }
    } catch (error) {
        console.error('Error in Feedback cleanup hook:', error);
    }
});

module.exports = mongoose.model('Feedback', feedbackSchema);
