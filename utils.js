/**
 * Utility functions for the ISTQB Quiz App
 */

/**
 * Shuffle an array using Fisher-Yates algorithm
 * @param {Array} array - Array to shuffle
 * @returns {Array} - New shuffled array
 */
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * Format time in MM:SS format
 * @param {number} seconds - Time in seconds
 * @returns {string} - Formatted time string
 */
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Parse filename to get quiz title
 * @param {string} filename - The filename including extension
 * @returns {string} - Clean title without extension
 */
function getQuizTitle(filename) {
    return filename.replace(/\.[^/.]+$/, '').replace(/-/g, ' ');
}

/**
 * Validate a quiz question object
 * @param {Object} question - Question object to validate
 * @param {number} index - Index for error reporting
 * @returns {Object} - {isValid: boolean, errors: string[]}
 */
function validateQuestion(question, index) {
    const errors = [];
    
    if (!question || typeof question !== 'object') {
        errors.push(`Domanda ${index + 1}: Non è un oggetto valido`);
        return { isValid: false, errors };
    }
    
    if (!question.question_text || typeof question.question_text !== 'string') {
        errors.push(`Domanda ${index + 1}: Manca question_text o non è una stringa`);
    }
    
    if (!question.question_option) {
        errors.push(`Domanda ${index + 1}: Manca question_option`);
    } else if (Array.isArray(question.question_option)) {
        // Array format: [{ option: "A", option_text: "..." }, ...]
        if (question.question_option.length < 2) {
            errors.push(`Domanda ${index + 1}: Deve avere almeno 2 opzioni`);
        }
    } else if (typeof question.question_option === 'object') {
        // Object format: { "a": "...", "b": "...", ... }
        const optionKeys = Object.keys(question.question_option);
        if (optionKeys.length < 2) {
            errors.push(`Domanda ${index + 1}: Deve avere almeno 2 opzioni`);
        }
    } else {
        errors.push(`Domanda ${index + 1}: question_option deve essere un array o un oggetto`);
    }
    
    if (!question.answer_option || typeof question.answer_option !== 'string') {
        errors.push(`Domanda ${index + 1}: Manca answer_option o non è una stringa`);
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Validate quiz data structure
 * @param {any} data - Data to validate as quiz
 * @param {string} filename - Filename for error reporting
 * @returns {Object} - {isValid: boolean, validQuestions: Object[], errors: string[]}
 */
function validateQuizData(data, filename) {
    const errors = [];
    const validQuestions = [];
    
    if (!Array.isArray(data)) {
        errors.push(`${filename}: Il file deve contenere un array di domande`);
        return { isValid: false, validQuestions: [], errors };
    }
    
    if (data.length === 0) {
        errors.push(`${filename}: L'array delle domande è vuoto`);
        return { isValid: false, validQuestions: [], errors };
    }
    
    data.forEach((question, index) => {
        const validation = validateQuestion(question, index);
        if (validation.isValid) {
            validQuestions.push(question);
        } else {
            errors.push(...validation.errors.map(err => `${filename}: ${err}`));
        }
    });
    
    return {
        isValid: validQuestions.length > 0,
        validQuestions,
        errors
    };
}

/**
 * Safely parse JSON with error handling
 * @param {string} jsonString - JSON string to parse
 * @returns {Object} - {success: boolean, data: any, error: string}
 */
function safeJsonParse(jsonString) {
    try {
        const data = JSON.parse(jsonString);
        return { success: true, data, error: null };
    } catch (error) {
        return { success: false, data: null, error: error.message };
    }
}

/**
 * Get option text from question options
 * @param {Object} question - Question object
 * @param {string} optionKey - Option key (A, B, C, D, etc.)
 * @returns {string} - Option text or empty string if not found
 */
function getOptionText(question, optionKey) {
    if (!question.question_option) {
        return '';
    }
    
    if (Array.isArray(question.question_option)) {
        // Array format: [{ option: "A", option_text: "..." }, ...]
        const option = question.question_option.find(opt => 
            opt && typeof opt === 'object' && opt.option === optionKey
        );
        return option && option.option_text ? option.option_text : '';
    } else if (typeof question.question_option === 'object') {
        // Object format: { "a": "...", "b": "...", ... }
        const lowerKey = optionKey.toLowerCase();
        return question.question_option[lowerKey] || '';
    }
    
    return '';
}

/**
 * Check if a question is multi-answer (multiple correct options)
 * @param {Object} question - Question object to check
 * @returns {boolean} - True if question has multiple correct answers
 */
function isMultiAnswerQuestion(question) {
    if (!question.answer_option_text) {
        return false;
    }
    
    if (typeof question.answer_option_text === 'object') {
        return Object.keys(question.answer_option_text).length > 1;
    }
    
    return false;
}

/**
 * Get all correct answers for a question
 * @param {Object} question - Question object
 * @returns {Array} - Array of correct answer keys
 */
function getCorrectAnswers(question) {
    const correctAnswers = [];
    
    if (question.answer_option_text && typeof question.answer_option_text === 'object') {
        // Multi-answer: all keys in answer_option_text are correct
        correctAnswers.push(...Object.keys(question.answer_option_text).map(key => key.toUpperCase()));
    } else if (question.answer_option) {
        // Single answer: use answer_option
        correctAnswers.push(question.answer_option.toUpperCase());
    }
    
    return correctAnswers;
}

/**
 * Get image path for a question based on quiz name and question number
 * @param {string} quizName - Name of the quiz (e.g., "ITASTQB-QTEST-FL-2023-B-QA")
 * @param {string} questionNumber - Question number
 * @returns {string|null} - Image path or null if no image exists
 */
function getQuestionImagePath(quizName, questionNumber) {
    // Extract quiz letter from filename (A, B, C, D)
    const quizMatch = quizName.match(/-(A|B|C|D)-/);
    if (!quizMatch) {
        return null;
    }
    
    const quizLetter = quizMatch[1];
    // Try both naming conventions: questionNumber.png and LetterQuestionNumber.png
    const imagePath1 = `img/${quizLetter}/${questionNumber}.png`;
    const imagePath2 = `img/${quizLetter}/${quizLetter}${questionNumber}.png`;
    
    // Return object with both possible paths for checking
    return { primary: imagePath1, alternative: imagePath2 };
}

/**
 * Check if an image exists for a question
 * @param {string} imagePath - Path to the image
 * @returns {Promise<boolean>} - True if image exists, false otherwise
 */
async function checkImageExists(imagePath) {
    try {
        const response = await fetch(imagePath, { method: 'HEAD' });
        return response.ok;
    } catch (error) {
        return false;
    }
}

/**
 * Prepare question for display with shuffled options
 * @param {Object} question - Original question object
 * @returns {Object} - Question with shuffled options and original key mapping
 */
function prepareQuestionForDisplay(question) {
    if (!question.question_option) {
        return question;
    }
    
    const isMultiAnswer = isMultiAnswerQuestion(question);
    
    if (Array.isArray(question.question_option)) {
        // Array format: shuffle the options
        const shuffledOptions = shuffleArray(question.question_option);
        return {
            ...question,
            question_option: shuffledOptions,
            original_options: question.question_option, // Keep original for reference
            isMultiAnswer: isMultiAnswer
        };
    } else if (typeof question.question_option === 'object') {
        // Object format: convert to array format for consistent display
        const optionEntries = Object.entries(question.question_option);
        const optionArray = optionEntries.map(([key, text]) => ({
            option: key.toUpperCase(),
            option_text: text
        }));
        
        const shuffledOptions = shuffleArray(optionArray);
        return {
            ...question,
            question_option: shuffledOptions,
            original_options: question.question_option, // Keep original for reference
            isMultiAnswer: isMultiAnswer
        };
    }
    
    return {
        ...question,
        isMultiAnswer: isMultiAnswer
    };
}

/**
 * Grade user answers against correct answers
 * @param {Array} questions - Array of question objects
 * @param {Object} userAnswers - Object with questionId: selectedOption mapping
 * @returns {Object} - Grading results
 */
function gradeQuiz(questions, userAnswers) {
    let correctCount = 0;
    const results = [];
    const learningObjectiveStats = {};
    
    questions.forEach((question, index) => {
        const questionId = index.toString();
        const userAnswer = userAnswers[questionId];
        const correctAnswers = getCorrectAnswers(question);
        const isMultiAnswer = isMultiAnswerQuestion(question);
        
        let isCorrect = false;
        
        if (isMultiAnswer) {
            // Multi-answer question: check if user selected all correct answers and no incorrect ones
            const userSelections = Array.isArray(userAnswer) ? userAnswer : (userAnswer ? [userAnswer] : []);
            const userSelectionsUpper = userSelections.map(ans => ans.toUpperCase());
            const correctAnswersUpper = correctAnswers.map(ans => ans.toUpperCase());
            
            // Check if arrays are equal (same elements, same count)
            isCorrect = correctAnswersUpper.length === userSelectionsUpper.length &&
                       correctAnswersUpper.every(ans => userSelectionsUpper.includes(ans));
        } else {
            // Single answer question: case-insensitive comparison
            const correctAnswer = question.answer_option;
            isCorrect = userAnswer && 
                userAnswer.toLowerCase() === correctAnswer.toLowerCase();
        }
        
        if (isCorrect) {
            correctCount++;
        }
        
        // Track learning objective statistics
        const learningObjective = question.learning_objective;
        if (learningObjective) {
            if (!learningObjectiveStats[learningObjective]) {
                learningObjectiveStats[learningObjective] = {
                    total: 0,
                    correct: 0,
                    incorrect: 0
                };
            }
            learningObjectiveStats[learningObjective].total++;
            if (isCorrect) {
                learningObjectiveStats[learningObjective].correct++;
            } else {
                learningObjectiveStats[learningObjective].incorrect++;
            }
        }
        
        // Get explanation text and all option explanations
        let explanation = '';
        let allExplanations = {};
        
        if (question.answer_option_text) {
            if (typeof question.answer_option_text === 'string') {
                explanation = question.answer_option_text;
            } else if (typeof question.answer_option_text === 'object') {
                // Object format: { "a": "explanation for A", "c": "explanation for C", ... }
                if (isMultiAnswer) {
                    // For multi-answer, combine all explanations
                    const explanationParts = [];
                    Object.entries(question.answer_option_text).forEach(([key, text]) => {
                        explanationParts.push(`${key.toUpperCase()}: ${text}`);
                        allExplanations[key.toUpperCase()] = text;
                    });
                    explanation = explanationParts.join('\n\n');
                } else {
                    // Single answer
                    const correctAnswer = question.answer_option;
                    const lowerCorrectAnswer = correctAnswer.toLowerCase();
                    explanation = question.answer_option_text[lowerCorrectAnswer] || '';
                    // Add correct answer explanations to allExplanations
                    Object.entries(question.answer_option_text).forEach(([key, text]) => {
                        allExplanations[key.toUpperCase()] = text;
                    });
                }
            }
        }
        
        // Add incorrect answer explanations
        if (question.no_answer_option_text && typeof question.no_answer_option_text === 'object') {
            Object.entries(question.no_answer_option_text).forEach(([key, text]) => {
                allExplanations[key.toUpperCase()] = text;
            });
        }

        // Format correct answers and user answers for display
        let correctAnswerDisplay, correctAnswerTextDisplay;
        let userAnswerDisplay, userAnswerTextDisplay;
        
        if (isMultiAnswer) {
            correctAnswerDisplay = correctAnswers.join(', ');
            correctAnswerTextDisplay = correctAnswers.map(ans => getOptionText(question, ans)).join('; ');
            
            if (Array.isArray(userAnswer) && userAnswer.length > 0) {
                userAnswerDisplay = userAnswer.join(', ');
                userAnswerTextDisplay = userAnswer.map(ans => getOptionText(question, ans)).join('; ');
            } else if (userAnswer) {
                userAnswerDisplay = userAnswer;
                userAnswerTextDisplay = getOptionText(question, userAnswer);
            } else {
                userAnswerDisplay = 'Nessuna risposta';
                userAnswerTextDisplay = 'Nessuna risposta';
            }
        } else {
            const correctAnswer = question.answer_option;
            correctAnswerDisplay = correctAnswer;
            correctAnswerTextDisplay = getOptionText(question, correctAnswer);
            userAnswerDisplay = userAnswer || 'Nessuna risposta';
            userAnswerTextDisplay = userAnswer ? getOptionText(question, userAnswer) : 'Nessuna risposta';
        }

        results.push({
            question: question.question_text,
            correctAnswer: correctAnswerDisplay,
            correctAnswerText: correctAnswerTextDisplay,
            userAnswer: userAnswerDisplay,
            userAnswerText: userAnswerTextDisplay,
            isCorrect,
            explanation: explanation,
            allExplanations: allExplanations,
            learningObjective: learningObjective,
            isMultiAnswer: isMultiAnswer
        });
    });
    
    return {
        score: correctCount,
        total: questions.length,
        percentage: Math.round((correctCount / questions.length) * 100),
        passed: correctCount >= 26, // Fixed pass threshold
        results,
        learningObjectiveStats
    };
}

/**
 * Save quiz state to localStorage
 * @param {string} quizName - Name of the quiz
 * @param {Object} state - State object to save
 */
function saveQuizState(quizName, state) {
    try {
        const key = `quiz_${quizName}`;
        localStorage.setItem(key, JSON.stringify({
            ...state,
            timestamp: Date.now()
        }));
    } catch (error) {
        console.warn('Unable to save quiz state:', error);
    }
}

/**
 * Load quiz state from localStorage
 * @param {string} quizName - Name of the quiz
 * @returns {Object|null} - Saved state or null if not found
 */
function loadQuizState(quizName) {
    try {
        const key = `quiz_${quizName}`;
        const saved = localStorage.getItem(key);
        if (saved) {
            const state = JSON.parse(saved);
            // Check if state is less than 24 hours old
            const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
            if (Date.now() - state.timestamp < maxAge) {
                return state;
            } else {
                // Remove expired state
                localStorage.removeItem(key);
            }
        }
    } catch (error) {
        console.warn('Unable to load quiz state:', error);
    }
    return null;
}

/**
 * Clear quiz state from localStorage
 * @param {string} quizName - Name of the quiz
 */
function clearQuizState(quizName) {
    try {
        const key = `quiz_${quizName}`;
        localStorage.removeItem(key);
    } catch (error) {
        console.warn('Unable to clear quiz state:', error);
    }
}

/**
 * Escape HTML characters to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Debounce function to limit function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func.apply(this, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Export functions for testing or external use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        shuffleArray,
        formatTime,
        getQuizTitle,
        validateQuestion,
        validateQuizData,
        safeJsonParse,
        getOptionText,
        isMultiAnswerQuestion,
        getCorrectAnswers,
        prepareQuestionForDisplay,
        gradeQuiz,
        saveQuizState,
        loadQuizState,
        clearQuizState,
        escapeHtml,
        debounce,
        getQuestionImagePath,
        checkImageExists
    };
}
