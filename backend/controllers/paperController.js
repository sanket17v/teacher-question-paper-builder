console.log("!!! PAPER CONTROLLER LOADED - DEBUG CHECK !!!");
const Paper = require('../models/Paper');
const User = require('../models/User');
const nodemailer = require('nodemailer');

// Create a new paper
exports.createPaper = async (req, res) => {
    try {
        const { examDetails, sections } = req.body;

        const paper = new Paper({
            user: req.user._id,
            title: examDetails.courseName || 'Untitled Paper', // Use Course Name as title if available
            examDetails,
            sections
        });

        const createdPaper = await paper.save();
        res.status(201).json(createdPaper);
    } catch (error) {
        console.error("Create Paper Error:", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// Get all papers for the logged-in user
exports.getPapers = async (req, res) => {
    try {
        const papers = await Paper.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.json(papers);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// Get a single paper by ID
exports.getPaperById = async (req, res) => {
    try {
        const paper = await Paper.findById(req.params.id);

        if (paper) {
            res.json(paper);
        } else {
            res.status(404).json({ message: 'Paper not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};


// Send Paper via Email & Share Internally
exports.sharePaper = async (req, res) => {
    try {
        const paperId = req.params.id;
        const { email } = req.body;

        // 1. Validation
        if (!email) {
            return res.status(400).json({ message: 'Email address is required' });
        }

        const targetEmail = email.toLowerCase().trim();

        // Check if user exists
        const recipientUser = await User.findOne({ email: targetEmail });
        if (!recipientUser) {
            return res.status(404).json({ message: 'User not found. Please ask them to register first.' });
        }

        // 2. Find Paper
        const paper = await Paper.findById(paperId);
        if (!paper) {
            return res.status(404).json({ message: 'Paper not found' });
        }

        // Safety check for legacy data
        if (!paper.sharedWith) {
            paper.sharedWith = [];
        }

        // 3. Update Database (Persistence)
        // Check if already shared to avoid duplicates
        const alreadyShared = paper.sharedWith.some(share => share.email === targetEmail);

        if (!alreadyShared) {
            paper.sharedWith.push({
                email: targetEmail,
                sentAt: new Date()
            });
            await paper.save();
        }

        // 4. Send Email (Best Effort / Soft Fail)
        let emailStatus = 'skipped';

        if (process.env.SMTP_USER && process.env.SMTP_PASS) {
            try {
                const transporter = nodemailer.createTransport({
                    host: process.env.SMTP_HOST,
                    port: process.env.SMTP_PORT, // 587 or 465
                    secure: process.env.SMTP_SECURE === 'true',
                    auth: {
                        user: process.env.SMTP_USER,
                        pass: process.env.SMTP_PASS,
                    },
                });

                // Construct Email Body
                let questionsHtml = '';
                if (paper.sections && paper.sections.length > 0) {
                    questionsHtml = paper.sections.map(section => `
                        <h4>${section.name}</h4>
                        <ul>
                            ${section.questions.map((q, i) => `<li><strong>Q${i + 1}:</strong> ${q.text} (${q.marks} Marks)</li>`).join('')}
                        </ul>
                     `).join('');
                } else if (paper.questions) {
                    questionsHtml = `<ul>${paper.questions.map((q, i) => `<li><strong>Q${i + 1}:</strong> ${q.text} (${q.marks} Marks)</li>`).join('')}</ul>`;
                }

                const mailOptions = {
                    from: process.env.SMTP_FROM || process.env.SMTP_USER,
                    to: targetEmail,
                    subject: `Question Paper Shared: ${paper.title}`,
                    html: `
                        <h2>${paper.title}</h2>
                        <h3>Details:</h3>
                        ${paper.examDetails ? `
                            <p><strong>Program:</strong> ${paper.examDetails.program || '-'}</p>
                            <p><strong>Course:</strong> ${paper.examDetails.courseName || '-'}</p>
                        ` : ''}
                        <hr/>
                        <h3>Questions:</h3>
                        ${questionsHtml}
                        <p>Sent via Teacher Question Paper Builder</p>
                    `,
                };

                await transporter.sendMail(mailOptions);
                emailStatus = 'sent';
            } catch (emailErr) {
                console.error('Email sending failed:', emailErr);
                emailStatus = 'failed';
            }
        }

        // 5. Return Success Response (Always success if DB save worked)
        res.json({
            message: 'Paper shared successfully',
            emailStatus,
            sharedWith: targetEmail
        });

    } catch (error) {
        console.error('Share error:', error);
        res.status(500).json({ message: 'Failed to share paper', error: error.message });
    }
};

// Get papers received
exports.getReceivedPapers = async (req, res) => {
    try {
        if (!req.user || !req.user.email) {
            return res.status(401).json({ message: 'User context missing' });
        }

        const userEmail = req.user.email.toLowerCase().trim();

        // Find papers where sharedWith.email matches userEmail
        const papers = await Paper.find({
            'sharedWith.email': userEmail
        })
            .populate('user', 'name email')
            .sort({ 'sharedWith.sentAt': -1 });

        res.json(papers);
    } catch (error) {
        console.error('Get Received Papers Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// Delete a paper
exports.deletePaper = async (req, res) => {
    try {
        const paper = await Paper.findById(req.params.id);

        if (!paper) {
            return res.status(404).json({ message: 'Paper not found' });
        }

        // Check user
        if (paper.user.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'User not authorized' });
        }

        await paper.deleteOne();
        res.json({ message: 'Paper removed' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
