const mongoose = require('mongoose');

const PaperSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Examination Form Metadata
    examDetails: {
        prn: String,
        semester: String,
        program: String,
        programName: String,
        courseCode: String,
        courseName: String,
        academicYear: String,
        duration: String,
        maxMarks: Number,
        totalQuestions: Number
    },
    // Paper Title (Internal or Display)
    title: {
        type: String,
        required: true,
        default: 'Untitled Paper'
    },
    // Question Sections
    sections: [
        {
            name: { type: String, required: true }, // e.g., "Section A"
            description: String,
            questions: [
                {
                    text: { type: String, required: true },
                    marks: { type: Number, required: true },
                    co: { type: String }, // Course Outcome
                    bl: { type: String }  // Bloom's Level
                }
            ]
        }
    ],
    // Course Outcomes
    courseOutcomes: [String],
    sharedWith: [
        {
            email: { type: String },
            sentAt: { type: Date, default: Date.now }
        }
    ],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Paper', PaperSchema);
