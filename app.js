/**
 * ISTQB Quiz Application
 * Main application logic for handling quiz loading, navigation, and grading
 */

class QuizApp {
    constructor() {
        this.quizzes = new Map();
        this.currentQuiz = null;
        this.currentQuestions = [];
        this.currentQuestionIndex = 0;
        this.userAnswers = {};
        this.timer = null;
        this.timeRemaining = 60 * 60; // 60 minutes in seconds
        this.validationErrors = [];
        
        this.initializeApp();
    }

    /**
     * Initialize the application
     */
    async initializeApp() {
        this.setupEventListeners();
        await this.loadQuizzes();
        this.displayQuizList();
    }

    /**
     * Setup event listeners for UI interactions
     */
    setupEventListeners() {
        // Landing page events
        document.getElementById('quiz-list').addEventListener('click', (e) => {
            if (e.target.classList.contains('start-quiz-btn')) {
                const quizName = e.target.dataset.quiz;
                this.startQuiz(quizName);
            }
        });

        // Resume/restart events
        document.getElementById('resume-btn').addEventListener('click', () => {
            this.resumeQuiz();
        });

        document.getElementById('restart-btn').addEventListener('click', () => {
            this.restartQuiz();
        });

        // Quiz navigation events
        document.getElementById('prev-btn').addEventListener('click', () => {
            this.previousQuestion();
        });

        document.getElementById('next-btn').addEventListener('click', () => {
            this.nextQuestion();
        });

        document.getElementById('submit-btn').addEventListener('click', () => {
            this.confirmSubmitQuiz();
        });

        // Results page events
        document.getElementById('back-to-home').addEventListener('click', () => {
            this.goToLandingPage();
        });

        document.getElementById('retry-quiz').addEventListener('click', () => {
            this.retryCurrentQuiz();
        });

        // Option selection event delegation
        document.getElementById('options-container').addEventListener('change', (e) => {
            if (e.target.type === 'radio') {
                this.selectOption(e.target.value);
                this.updateNavigationButtons();
            } else if (e.target.type === 'checkbox') {
                this.selectMultiOption(e.target.value, e.target.checked);
                this.updateNavigationButtons();
            }
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (document.getElementById('quiz-page').classList.contains('active')) {
                switch (e.key) {
                    case 'ArrowLeft':
                        if (!document.getElementById('prev-btn').disabled) {
                            this.previousQuestion();
                        }
                        break;
                    case 'ArrowRight':
                        if (!document.getElementById('next-btn').disabled) {
                            this.nextQuestion();
                        }
                        break;
                    case '1':
                    case '2':
                    case '3':
                    case '4':
                    case '5':
                        const optionIndex = parseInt(e.key) - 1;
                        const radioOptions = document.querySelectorAll('input[name="answer"]');
                        const checkboxOptions = document.querySelectorAll('input[name="answer-multi"]');
                        
                        if (radioOptions.length > 0 && radioOptions[optionIndex]) {
                            // Single answer question
                            radioOptions[optionIndex].checked = true;
                            this.selectOption(radioOptions[optionIndex].value);
                            this.updateNavigationButtons();
                        } else if (checkboxOptions.length > 0 && checkboxOptions[optionIndex]) {
                            // Multi-answer question - toggle checkbox
                            checkboxOptions[optionIndex].checked = !checkboxOptions[optionIndex].checked;
                            this.selectMultiOption(checkboxOptions[optionIndex].value, checkboxOptions[optionIndex].checked);
                            this.updateNavigationButtons();
                        }
                        break;
                }
            }
        });
    }

    /**
     * Load quiz files from the json_Q_A folder
     */
    async loadQuizzes() {
        const loadingEl = document.getElementById('loading');
        const errorEl = document.getElementById('error-message');
        
        loadingEl.classList.remove('hidden');
        errorEl.classList.add('hidden');

        try {
            // Try to load from json_Q_A folder
            const quizFiles = await this.getQuizFiles();
            
            if (quizFiles.length === 0) {
                // Fallback to sample quiz if no files found
                await this.loadSampleQuiz();
            } else {
                for (const file of quizFiles) {
                    await this.loadQuizFile(file);
                }
            }
        } catch (error) {
            console.error('Error loading quizzes:', error);
            await this.loadSampleQuiz();
        }

        loadingEl.classList.add('hidden');
        
        if (this.quizzes.size === 0) {
            errorEl.classList.remove('hidden');
        }

        this.displayValidationErrors();
    }

    /**
     * Get list of quiz files (simplified for static deployment)
     */
    async getQuizFiles() {
        // In a real-world scenario, this would use a server endpoint
        // For static deployment, we'll try to load known files based on the workspace structure
        const knownFiles = [
            'ITASTQB-gloss&sylla.json',
            'ITASTQB-QTEST-FL-2023-A-QA.json',
            'ITASTQB-QTEST-FL-2023-B-QA.json',
            'ITASTQB-QTEST-FL-2023-C-QA.json',
            'ITASTQB-QTEST-FL-2023-D-QA.json'
        ];

        const existingFiles = [];
        
        for (const filename of knownFiles) {
            try {
                const response = await fetch(`json_Q_A/${filename}`);
                if (response.ok) {
                    existingFiles.push(filename);
                }
            } catch (error) {
                // File doesn't exist or can't be loaded
                console.log(`Could not load ${filename}`);
            }
        }

        return existingFiles;
    }

    /**
     * Load sample quiz as fallback
     */
    async loadSampleQuiz() {
        try {
            const response = await fetch('sample-quiz.json');
            if (response.ok) {
                const text = await response.text();
                const parseResult = safeJsonParse(text);
                
                if (parseResult.success) {
                    const validation = validateQuizData(parseResult.data, 'sample-quiz.json');
                    if (validation.isValid) {
                        this.quizzes.set('sample-quiz', validation.validQuestions);
                    }
                    this.validationErrors.push(...validation.errors);
                }
            }
        } catch (error) {
            console.warn('Could not load sample quiz:', error);
        }
    }

    /**
     * Load a single quiz file
     */
    async loadQuizFile(filename) {
        try {
            const response = await fetch(`json_Q_A/${filename}`);
            const text = await response.text();
            const parseResult = safeJsonParse(text);
            
            if (!parseResult.success) {
                this.validationErrors.push(`${filename}: Errore parsing JSON - ${parseResult.error}`);
                return;
            }

            const validation = validateQuizData(parseResult.data, filename);
            
            if (validation.isValid) {
                const quizName = getQuizTitle(filename);
                this.quizzes.set(quizName, validation.validQuestions);
            }
            
            this.validationErrors.push(...validation.errors);
            
        } catch (error) {
            this.validationErrors.push(`${filename}: Errore caricamento file - ${error.message}`);
        }
    }

    /**
     * Display the list of available quizzes
     */
    displayQuizList() {
        const quizListEl = document.getElementById('quiz-list');
        quizListEl.innerHTML = '';

        if (this.quizzes.size === 0) {
            quizListEl.innerHTML = '<p>Nessun quiz disponibile.</p>';
            return;
        }

        this.quizzes.forEach((questions, quizName) => {
            const quizItem = document.createElement('div');
            quizItem.className = 'quiz-item';
            quizItem.innerHTML = `
                <h3>${escapeHtml(quizName)}</h3>
                <p>Numero di domande: ${questions.length}</p>
                <button class="btn btn-primary start-quiz-btn" data-quiz="${escapeHtml(quizName)}">
                    Inizia
                </button>
            `;
            quizListEl.appendChild(quizItem);
        });
    }

    /**
     * Display validation errors if any
     */
    displayValidationErrors() {
        const errorsEl = document.getElementById('validation-errors');
        const errorListEl = document.getElementById('error-list');
        
        if (this.validationErrors.length > 0) {
            errorListEl.innerHTML = this.validationErrors
                .map(error => `<li>${escapeHtml(error)}</li>`)
                .join('');
            errorsEl.classList.remove('hidden');
        } else {
            errorsEl.classList.add('hidden');
        }
    }

    /**
     * Start a quiz
     */
    startQuiz(quizName) {
        const savedState = loadQuizState(quizName);
        
        if (savedState) {
            this.currentQuiz = quizName;
            this.setupResumePrompt(savedState);
        } else {
            this.initializeNewQuiz(quizName);
        }
    }

    /**
     * Setup resume prompt for saved quiz
     */
    setupResumePrompt(savedState) {
        this.showPage('quiz-page');
        document.getElementById('resume-prompt').classList.remove('hidden');
        document.getElementById('question-container').classList.add('hidden');
        document.querySelector('.quiz-controls').classList.add('hidden');
        
        document.getElementById('quiz-title').textContent = this.currentQuiz;
        
        // Store saved state for potential resume
        this.savedState = savedState;
    }

    /**
     * Resume a saved quiz
     */
    resumeQuiz() {
        const questions = this.quizzes.get(this.currentQuiz);
        this.currentQuestions = this.savedState.questions;
        this.currentQuestionIndex = this.savedState.currentQuestionIndex;
        this.userAnswers = this.savedState.userAnswers;
        this.timeRemaining = this.savedState.timeRemaining;
        
        this.startQuizDisplay();
        this.savedState = null;
    }

    /**
     * Restart a quiz (ignore saved state)
     */
    restartQuiz() {
        clearQuizState(this.currentQuiz);
        this.initializeNewQuiz(this.currentQuiz);
    }

    /**
     * Initialize a new quiz session
     */
    initializeNewQuiz(quizName) {
        this.currentQuiz = quizName;
        const questions = this.quizzes.get(quizName);
        
        // Shuffle questions for each attempt
        this.currentQuestions = shuffleArray(questions).map(prepareQuestionForDisplay);
        this.currentQuestionIndex = 0;
        this.userAnswers = {};
        this.timeRemaining = 60 * 60; // Reset timer to 60 minutes
        
        this.startQuizDisplay();
    }

    /**
     * Start the quiz display and timer
     */
    startQuizDisplay() {
        this.showPage('quiz-page');
        document.getElementById('resume-prompt').classList.add('hidden');
        document.getElementById('question-container').classList.remove('hidden');
        document.querySelector('.quiz-controls').classList.remove('hidden');
        
        document.getElementById('quiz-title').textContent = this.currentQuiz;
        
        this.startTimer();
        this.displayCurrentQuestion();
        this.updateNavigationButtons();
    }

    /**
     * Start the countdown timer
     */
    startTimer() {
        this.updateTimerDisplay();
        
        this.timer = setInterval(() => {
            this.timeRemaining--;
            this.updateTimerDisplay();
            
            // Auto-save every 30 seconds
            if (this.timeRemaining % 30 === 0) {
                this.saveCurrentState();
            }
            
            if (this.timeRemaining <= 0) {
                this.timeUp();
            }
        }, 1000);
    }

    /**
     * Update timer display
     */
    updateTimerDisplay() {
        const timerEl = document.getElementById('timer');
        timerEl.textContent = `Tempo rimanente: ${formatTime(this.timeRemaining)}`;
        
        // Change color when time is running low
        if (this.timeRemaining <= 300) { // 5 minutes
            timerEl.style.color = '#c0392b';
        } else if (this.timeRemaining <= 600) { // 10 minutes
            timerEl.style.color = '#f39c12';
        } else {
            timerEl.style.color = '#c0392b';
        }
    }

    /**
     * Handle time expiry
     */
    timeUp() {
        clearInterval(this.timer);
        clearQuizState(this.currentQuiz);
        this.submitQuiz();
    }

    /**
     * Display the current question
     */
    async displayCurrentQuestion() {
        const question = this.currentQuestions[this.currentQuestionIndex];
        const questionTextEl = document.getElementById('question-text');
        const optionsEl = document.getElementById('options-container');
        const progressEl = document.getElementById('question-progress');
        const questionImageContainer = document.getElementById('question-image-container');
        const questionImage = document.getElementById('question-image');
        
        // Format question text with proper list formatting
        const formattedQuestionText = formatQuestionText(question.question_text);
        questionTextEl.innerHTML = formattedQuestionText;
        
        progressEl.textContent = `Domanda ${this.currentQuestionIndex + 1}/${this.currentQuestions.length}`;
        
        // Add multi-answer indicator
        if (question.isMultiAnswer) {
            progressEl.textContent += ' (Risposta multipla)';
        }
        
        // Handle question image
        if (question.question_image && question.question_image.trim() !== '') {
            // Use the image path directly from the JSON data
            console.log(`Loading image for question ${question.question_number}: ${question.question_image}`);
            
            // Reset the container state
            questionImageContainer.classList.add('hidden');
            
            questionImage.onload = () => {
                questionImageContainer.classList.remove('hidden');
                console.log(`✅ Image loaded successfully: ${questionImage.src}`);
            };
            
            questionImage.onerror = () => {
                // If the JSON path fails, try the fallback method
                console.log(`❌ JSON image path failed, trying fallback paths...`);
                const imagePaths = getQuestionImagePath(this.currentQuiz, question.question_number);
                if (imagePaths) {
                    questionImage.onload = () => {
                        questionImageContainer.classList.remove('hidden');
                        console.log(`✅ Fallback image loaded successfully: ${questionImage.src}`);
                    };
                    
                    questionImage.onerror = () => {
                        // If primary fallback fails, try alternative path
                        if (questionImage.src.includes(imagePaths.primary)) {
                            console.log(`❌ Primary fallback failed, trying alternative: ${imagePaths.alternative}`);
                            questionImage.src = imagePaths.alternative;
                        } else {
                            // All paths failed, hide container
                            questionImageContainer.classList.add('hidden');
                            console.log(`❌ No image found for question ${question.question_number}`);
                        }
                    };
                    
                    questionImage.src = imagePaths.primary;
                } else {
                    questionImageContainer.classList.add('hidden');
                    console.log(`❌ No image found for question ${question.question_number}`);
                }
            };
            
            // Set initial image source and alt text
            questionImage.src = question.question_image;
            questionImage.alt = `Immagine per la domanda ${question.question_number}`;
        } else {
            // No image path in JSON, try fallback method
            const imagePaths = getQuestionImagePath(this.currentQuiz, question.question_number);
            if (imagePaths) {
                console.log(`No image in JSON, looking for images for question ${question.question_number}:`, imagePaths);
                
                // Reset the container state
                questionImageContainer.classList.add('hidden');
                
                // First, try to load the primary image path
                questionImage.onload = () => {
                    questionImageContainer.classList.remove('hidden');
                    console.log(`✅ Image loaded successfully: ${questionImage.src}`);
                };
                
                questionImage.onerror = () => {
                    // If primary fails, try alternative path
                    if (questionImage.src.includes(imagePaths.primary)) {
                        console.log(`❌ Primary image failed, trying alternative: ${imagePaths.alternative}`);
                        questionImage.src = imagePaths.alternative;
                    } else {
                        // Both paths failed, hide container
                        questionImageContainer.classList.add('hidden');
                        console.log(`❌ No image found for question ${question.question_number}`);
                    }
                };
                
                // Set initial image source and alt text
                questionImage.src = imagePaths.primary;
                questionImage.alt = `Immagine per la domanda ${question.question_number}`;
            } else {
                questionImageContainer.classList.add('hidden');
            }
        }
        
        // Clear previous options
        optionsEl.innerHTML = '';
        
        // Display options
        if (question.question_option && Array.isArray(question.question_option)) {
            question.question_option.forEach((option, index) => {
                if (option && option.option && option.option_text) {
                    const optionEl = document.createElement('div');
                    optionEl.className = 'option';
                    
                    const inputId = `option-${index}`;
                    const inputType = question.isMultiAnswer ? 'checkbox' : 'radio';
                    const inputName = question.isMultiAnswer ? 'answer-multi' : 'answer';
                    
                    let isSelected = false;
                    if (question.isMultiAnswer) {
                        const userAnswers = this.userAnswers[this.currentQuestionIndex];
                        isSelected = Array.isArray(userAnswers) && userAnswers.includes(option.option);
                    } else {
                        isSelected = this.userAnswers[this.currentQuestionIndex] === option.option;
                    }
                    
                    optionEl.innerHTML = `
                        <input type="${inputType}" 
                               id="${inputId}" 
                               name="${inputName}" 
                               value="${escapeHtml(option.option)}"
                               ${isSelected ? 'checked' : ''}
                               aria-describedby="question-text">
                        <label for="${inputId}">${escapeHtml(option.option_text)}</label>
                    `;
                    
                    if (isSelected) {
                        optionEl.classList.add('selected');
                    }
                    
                    // Add click handler to the entire option div
                    optionEl.addEventListener('click', () => {
                        const input = optionEl.querySelector(`input[type="${inputType}"]`);
                        if (question.isMultiAnswer) {
                            input.checked = !input.checked;
                            this.selectMultiOption(input.value, input.checked);
                        } else {
                            input.checked = true;
                            this.selectOption(input.value);
                        }
                        this.updateNavigationButtons();
                    });
                    
                    optionsEl.appendChild(optionEl);
                }
            });
        }
    }

    /**
     * Select an option for the current question (single answer)
     */
    selectOption(optionValue) {
        this.userAnswers[this.currentQuestionIndex] = optionValue;
        
        // Update visual feedback
        document.querySelectorAll('.option').forEach(option => {
            option.classList.remove('selected');
        });
        
        const selectedOption = document.querySelector(`input[value="${optionValue}"]`);
        if (selectedOption) {
            selectedOption.closest('.option').classList.add('selected');
        }
        
        // Save state after answer selection
        this.saveCurrentState();
    }

    /**
     * Select/deselect an option for multi-answer questions
     */
    selectMultiOption(optionValue, isChecked) {
        const questionIndex = this.currentQuestionIndex;
        
        if (!this.userAnswers[questionIndex]) {
            this.userAnswers[questionIndex] = [];
        }
        
        if (!Array.isArray(this.userAnswers[questionIndex])) {
            this.userAnswers[questionIndex] = [];
        }
        
        if (isChecked) {
            // Add option if not already present
            if (!this.userAnswers[questionIndex].includes(optionValue)) {
                this.userAnswers[questionIndex].push(optionValue);
            }
        } else {
            // Remove option
            this.userAnswers[questionIndex] = this.userAnswers[questionIndex].filter(
                value => value !== optionValue
            );
        }
        
        // Update visual feedback
        document.querySelectorAll('.option').forEach(option => {
            const checkbox = option.querySelector('input[type="checkbox"]');
            if (checkbox) {
                if (checkbox.checked) {
                    option.classList.add('selected');
                } else {
                    option.classList.remove('selected');
                }
            }
        });
        
        // Save state after answer selection
        this.saveCurrentState();
    }

    /**
     * Navigate to previous question
     */
    previousQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.displayCurrentQuestion();
            this.updateNavigationButtons();
        }
    }

    /**
     * Navigate to next question
     */
    nextQuestion() {
        if (this.currentQuestionIndex < this.currentQuestions.length - 1) {
            this.currentQuestionIndex++;
            this.displayCurrentQuestion();
            this.updateNavigationButtons();
        }
    }

    /**
     * Update navigation button states
     */
    updateNavigationButtons() {
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        
        prevBtn.disabled = this.currentQuestionIndex === 0;
        nextBtn.disabled = this.currentQuestionIndex === this.currentQuestions.length - 1;
    }

    /**
     * Confirm quiz submission
     */
    confirmSubmitQuiz() {
        let answeredCount = 0;
        const totalQuestions = this.currentQuestions.length;
        
        // Count answered questions (considering both single and multi-answer)
        for (let i = 0; i < totalQuestions; i++) {
            const answer = this.userAnswers[i];
            if (answer !== undefined && answer !== null) {
                if (Array.isArray(answer)) {
                    // Multi-answer: count as answered if at least one option is selected
                    if (answer.length > 0) {
                        answeredCount++;
                    }
                } else {
                    // Single answer: count as answered if not empty
                    if (answer !== '') {
                        answeredCount++;
                    }
                }
            }
        }
        
        const unansweredCount = totalQuestions - answeredCount;
        
        let message = 'Sei sicuro di voler inviare il quiz?';
        if (unansweredCount > 0) {
            message += `\n\nHai ${unansweredCount} domande senza risposta su ${totalQuestions}.`;
        }
        
        if (confirm(message)) {
            this.submitQuiz();
        }
    }

    /**
     * Submit the quiz and show results
     */
    submitQuiz() {
        clearInterval(this.timer);
        clearQuizState(this.currentQuiz);
        
        const results = gradeQuiz(this.currentQuestions, this.userAnswers);
        this.displayResults(results);
    }

    /**
     * Display quiz results
     */
    displayResults(results) {
        this.showPage('results-page');
        
        const scoreEl = document.getElementById('final-score');
        const statusEl = document.getElementById('pass-status');
        const noteEl = document.getElementById('score-note');
        const resultsEl = document.getElementById('question-results');
        const learningObjectiveStatsEl = document.getElementById('learning-objective-stats');
        
        scoreEl.textContent = `Punteggio: ${results.score}/${results.total}`;
        
        // Pass/Fail status
        statusEl.textContent = results.passed ? 'PASSA' : 'RESPINGE';
        statusEl.className = `pass-status ${results.passed ? 'pass' : 'fail'}`;
        
        // Show note if quiz doesn't have exactly 40 questions
        if (results.total !== 40) {
            noteEl.innerHTML = `
                <strong>Nota:</strong> Questo quiz contiene ${results.total} domande. 
                La soglia di superamento rimane fissa a 26/40 come da regolamento.
            `;
            noteEl.classList.remove('hidden');
        } else {
            noteEl.classList.add('hidden');
        }
        
        // Display learning objective statistics
        this.displayLearningObjectiveStats(results.learningObjectiveStats, learningObjectiveStatsEl);
        
        // Display detailed results
        resultsEl.innerHTML = '';
        results.results.forEach((result, index) => {
            const resultEl = document.createElement('div');
            resultEl.className = `question-result ${result.isCorrect ? 'correct' : 'incorrect'}`;
            
            let explanationHtml = '';
            if (result.allExplanations && Object.keys(result.allExplanations).length > 0) {
                const explanationItems = Object.entries(result.allExplanations).map(([option, explanation]) => {
                    let isCorrect = false;
                    let isUserAnswer = false;
                    
                    if (result.isMultiAnswer) {
                        // For multi-answer, check if option is in correct answers
                        const correctAnswers = result.correctAnswer.split(', ').map(ans => ans.toLowerCase());
                        const userAnswers = result.userAnswer !== 'Nessuna risposta' ? 
                            result.userAnswer.split(', ').map(ans => ans.toLowerCase()) : [];
                        
                        isCorrect = correctAnswers.includes(option.toLowerCase());
                        isUserAnswer = userAnswers.includes(option.toLowerCase());
                    } else {
                        // Single answer
                        isCorrect = option.toLowerCase() === result.correctAnswer.toLowerCase();
                        isUserAnswer = option.toLowerCase() === result.userAnswer.toLowerCase();
                    }
                    
                    const cssClass = isCorrect ? 'correct-explanation' : 'incorrect-explanation';
                    const userClass = isUserAnswer ? 'user-explanation' : '';
                    
                    return `
                        <li class="${cssClass} ${userClass}">
                            <strong>Opzione ${escapeHtml(option)}:</strong> ${escapeHtml(explanation)}
                        </li>
                    `;
                }).join('');
                
                explanationHtml = `
                    <div class="explanation">
                        <strong>Spiegazioni:</strong>
                        <ul class="explanation-list">
                            ${explanationItems}
                        </ul>
                    </div>
                `;
            } else if (result.explanation) {
                explanationHtml = `
                    <div class="explanation">
                        <strong>Spiegazione:</strong> ${escapeHtml(result.explanation)}
                    </div>
                `;
            }
            
            // Get all options for this question
            const question = this.currentQuestions[index];
            let allOptionsHtml = '';
            if (question.question_option && Array.isArray(question.question_option)) {
                const correctAnswers = result.isMultiAnswer ? 
                    result.correctAnswer.split(', ').map(ans => ans.toLowerCase()) : 
                    [result.correctAnswer.toLowerCase()];
                const userAnswers = result.userAnswer !== 'Nessuna risposta' ? 
                    (result.isMultiAnswer ? 
                        result.userAnswer.split(', ').map(ans => ans.toLowerCase()) : 
                        [result.userAnswer.toLowerCase()]) : [];
                
                allOptionsHtml = `
                    <div class="all-options">
                        <strong>Tutte le opzioni:</strong>
                        <ul>
                            ${question.question_option.map(option => {
                                const isCorrect = correctAnswers.includes(option.option.toLowerCase());
                                const isUserAnswer = userAnswers.includes(option.option.toLowerCase());
                                
                                return `
                                    <li class="${isCorrect ? 'correct-option' : ''}
                                              ${isUserAnswer ? 'user-option' : ''}">
                                        <strong>${escapeHtml(option.option)}:</strong> ${escapeHtml(option.option_text)}
                                    </li>
                                `;
                            }).join('')}
                        </ul>
                    </div>
                `;
            }
            
            // Add question type indicator
            const questionTypeIndicator = result.isMultiAnswer ? 
                '<span class="question-type">(Risposta multipla)</span>' : 
                '<span class="question-type">(Risposta singola)</span>';
            
            resultEl.innerHTML = `
                <h4>Domanda ${index + 1} ${result.learningObjective ? `(${result.learningObjective})` : ''} ${questionTypeIndicator}</h4>
                <div class="question-text">${formatQuestionText(result.question)}</div>
                ${allOptionsHtml}
                <div class="result-info">
                    <div class="correct-answer">
                        <strong>Risposta${result.isMultiAnswer ? 'e' : ''} corretta${result.isMultiAnswer ? 'e' : ''}:</strong> ${escapeHtml(result.correctAnswer)} - ${escapeHtml(result.correctAnswerText)}
                    </div>
                    <div class="user-answer">
                        <strong>La tua risposta${result.isMultiAnswer ? 'e' : ''}:</strong> ${escapeHtml(result.userAnswer)} - ${escapeHtml(result.userAnswerText)}
                    </div>
                </div>
                ${explanationHtml}
            `;
            
            resultsEl.appendChild(resultEl);
        });
    }

    /**
     * Display learning objective statistics
     */
    displayLearningObjectiveStats(stats, container) {
        if (!stats || Object.keys(stats).length === 0) {
            container.innerHTML = '<p>Nessun obiettivo di apprendimento disponibile per questo quiz.</p>';
            return;
        }

        // Group learning objectives by macro areas
        const groupedObjectives = this.groupLearningObjectivesByMacroArea(stats);
        
        let html = '';
        
        // Sort macro areas (FL-1, FL-2, etc.)
        const sortedMacroAreas = Object.keys(groupedObjectives).sort((a, b) => {
            const aNum = parseInt(a.split('-')[1]);
            const bNum = parseInt(b.split('-')[1]);
            return aNum - bNum;
        });

        sortedMacroAreas.forEach(macroArea => {
            const macroAreaData = groupedObjectives[macroArea];
            
            // Calculate macro area totals
            const macroAreaTotalQuestions = Object.values(macroAreaData.subAreas)
                .reduce((sum, subArea) => sum + Object.values(subArea.objectives)
                .reduce((subSum, obj) => subSum + obj.total, 0), 0);
            const macroAreaCorrect = Object.values(macroAreaData.subAreas)
                .reduce((sum, subArea) => sum + Object.values(subArea.objectives)
                .reduce((subSum, obj) => subSum + obj.correct, 0), 0);
            const macroAreaIncorrect = macroAreaTotalQuestions - macroAreaCorrect;
            const macroAreaSuccessRate = Math.round((macroAreaCorrect / macroAreaTotalQuestions) * 100);
            
            const macroAreaStatusClass = macroAreaIncorrect === 0 ? 'perfect' : 
                                        macroAreaSuccessRate >= 70 ? 'good' : 
                                        macroAreaSuccessRate >= 50 ? 'average' : 'poor';

            html += `
                <div class="macro-area ${macroAreaStatusClass}">
                    <div class="macro-area-header">
                        <h3>${escapeHtml(macroArea)}</h3>
                        <div class="macro-area-stats">
                            <span class="success-rate">${macroAreaSuccessRate}%</span>
                            <span class="stats-detail">(${macroAreaCorrect}/${macroAreaTotalQuestions})</span>
                        </div>
                    </div>
                    <div class="sub-areas">
            `;
            
            // Sort sub areas (FL-1.1, FL-1.2, etc.)
            const sortedSubAreas = Object.keys(macroAreaData.subAreas).sort((a, b) => {
                const aMatch = a.match(/FL-(\d+)\.(\d+)/);
                const bMatch = b.match(/FL-(\d+)\.(\d+)/);
                if (aMatch && bMatch) {
                    const aNum = parseInt(aMatch[1]) * 100 + parseInt(aMatch[2]);
                    const bNum = parseInt(bMatch[1]) * 100 + parseInt(bMatch[2]);
                    return aNum - bNum;
                }
                return a.localeCompare(b);
            });

            sortedSubAreas.forEach(subArea => {
                const subAreaData = macroAreaData.subAreas[subArea];
                
                // Calculate sub area totals
                const subAreaTotalQuestions = Object.values(subAreaData.objectives)
                    .reduce((sum, obj) => sum + obj.total, 0);
                const subAreaCorrect = Object.values(subAreaData.objectives)
                    .reduce((sum, obj) => sum + obj.correct, 0);
                const subAreaIncorrect = subAreaTotalQuestions - subAreaCorrect;
                const subAreaSuccessRate = Math.round((subAreaCorrect / subAreaTotalQuestions) * 100);
                
                const subAreaStatusClass = subAreaIncorrect === 0 ? 'perfect' : 
                                          subAreaSuccessRate >= 70 ? 'good' : 
                                          subAreaSuccessRate >= 50 ? 'average' : 'poor';

                html += `
                    <div class="sub-area ${subAreaStatusClass}">
                        <div class="sub-area-header">
                            <h4>${escapeHtml(subArea)}</h4>
                            <div class="sub-area-stats">
                                <span class="success-rate">${subAreaSuccessRate}%</span>
                                <span class="stats-detail">(${subAreaCorrect}/${subAreaTotalQuestions})</span>
                            </div>
                        </div>
                        <div class="objectives-grid">
                `;
                
                // Sort specific objectives (FL-1.1.1, FL-1.1.2, etc.)
                const sortedObjectives = Object.keys(subAreaData.objectives).sort((a, b) => {
                    const aMatch = a.match(/FL-(\d+)\.(\d+)\.(\d+)/);
                    const bMatch = b.match(/FL-(\d+)\.(\d+)\.(\d+)/);
                    if (aMatch && bMatch) {
                        const aNum = parseInt(aMatch[1]) * 10000 + parseInt(aMatch[2]) * 100 + parseInt(aMatch[3]);
                        const bNum = parseInt(bMatch[1]) * 10000 + parseInt(bMatch[2]) * 100 + parseInt(bMatch[3]);
                        return aNum - bNum;
                    }
                    return a.localeCompare(b);
                });

                sortedObjectives.forEach(objective => {
                    const stat = subAreaData.objectives[objective];
                    const successRate = Math.round((stat.correct / stat.total) * 100);
                    const statusClass = stat.incorrect === 0 ? 'perfect' : 
                                       successRate >= 70 ? 'good' : 
                                       successRate >= 50 ? 'average' : 'poor';
                    
                    html += `
                        <div class="learning-objective-item ${statusClass}">
                            <div class="objective-header">
                                <h5>${escapeHtml(objective)}</h5>
                                <span class="success-rate">${successRate}%</span>
                            </div>
                            <div class="objective-stats">
                                <span class="correct">✓ ${stat.correct}</span>
                                <span class="total">/ ${stat.total}</span>
                                ${stat.incorrect > 0 ? `<span class="incorrect">✗ ${stat.incorrect}</span>` : ''}
                            </div>
                        </div>
                    `;
                });
                
                html += `
                        </div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        });
        
        // Add summary information
        const totalErrors = Object.values(stats).reduce((sum, stat) => sum + stat.incorrect, 0);
        const totalQuestions = Object.values(stats).reduce((sum, stat) => sum + stat.total, 0);
        const objectivesWithErrors = Object.values(stats).filter(stat => stat.incorrect > 0).length;
        
        html += `
            <div class="learning-objective-summary-info">
                <p><strong>Riepilogo:</strong></p>
                <ul>
                    <li>Aree macro coperte: ${sortedMacroAreas.length}</li>
                    <li>Obiettivi di apprendimento totali: ${Object.keys(stats).length}</li>
                    <li>Obiettivi con errori: ${objectivesWithErrors}</li>
                    <li>Errori totali: ${totalErrors}/${totalQuestions}</li>
                </ul>
            </div>
        `;
        
        container.innerHTML = html;
    }

    /**
     * Group learning objectives by macro area and sub area
     */
    groupLearningObjectivesByMacroArea(stats) {
        const grouped = {};
        
        Object.keys(stats).forEach(objective => {
            const match = objective.match(/FL-(\d+)\.(\d+)\.(\d+)/);
            if (match) {
                const macroArea = `FL-${match[1]}`;
                const subArea = `FL-${match[1]}.${match[2]}`;
                
                if (!grouped[macroArea]) {
                    grouped[macroArea] = { subAreas: {} };
                }
                
                if (!grouped[macroArea].subAreas[subArea]) {
                    grouped[macroArea].subAreas[subArea] = { objectives: {} };
                }
                
                grouped[macroArea].subAreas[subArea].objectives[objective] = stats[objective];
            }
        });
        
        return grouped;
    }

    /**
     * Save current quiz state to localStorage
     */
    saveCurrentState() {
        if (this.currentQuiz && this.timeRemaining > 0) {
            const state = {
                questions: this.currentQuestions,
                currentQuestionIndex: this.currentQuestionIndex,
                userAnswers: this.userAnswers,
                timeRemaining: this.timeRemaining
            };
            saveQuizState(this.currentQuiz, state);
        }
    }

    /**
     * Go back to landing page
     */
    goToLandingPage() {
        this.showPage('landing-page');
        this.resetQuizState();
    }

    /**
     * Retry current quiz
     */
    retryCurrentQuiz() {
        if (this.currentQuiz) {
            clearQuizState(this.currentQuiz);
            this.initializeNewQuiz(this.currentQuiz);
        }
    }

    /**
     * Reset quiz state
     */
    resetQuizState() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this.currentQuiz = null;
        this.currentQuestions = [];
        this.currentQuestionIndex = 0;
        this.userAnswers = {};
        this.timeRemaining = 60 * 60;
    }

    /**
     * Show a specific page and hide others
     */
    showPage(pageId) {
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        document.getElementById(pageId).classList.add('active');
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new QuizApp();
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = QuizApp;
}
