# Quiz ISTQB App

Un'applicazione web statica per quiz ISTQB che legge file JSON da una cartella locale e crea quiz separati per ogni file.

## Caratteristiche

- **Pagina principale**: Elenco dei quiz disponibili con numero di domande e pulsante "Inizia"
- **Timer**: Countdown di 60 minuti con salvataggio automatico dello stato
- **Domande randomizzate**: Ordine casuale delle domande e delle opzioni per ogni tentativo
- **Navigazione**: Avanti/Indietro con indicatore di progresso
- **Salvataggio automatico**: Possibilità di riprendere quiz interrotti
- **Risultati dettagliati**: Punteggio, soglia di superamento fissa (26/40), feedback per domanda
- **Gestione errori**: Validazione JSON con notifiche non intrusive
- **Accessibilità**: Navigazione da tastiera e etichette ARIA

## Struttura dei file

```
/
├── index.html          # Pagina principale dell'applicazione
├── styles.css          # Fogli di stile CSS
├── app.js              # Logica principale dell'applicazione
├── utils.js            # Funzioni di utilità
├── sample-quiz.json    # Quiz di esempio per test
├── README.md           # Questo file
└── json_Q_A/           # Cartella contenente i file JSON dei quiz
    ├── ITASTQB-QTEST-FL-2023-A-QA.json
    ├── ITASTQB-QTEST-FL-2023-B-QA.json
    └── ...
```

## Formato JSON richiesto

Ogni file JSON deve contenere un array di oggetti domanda con questa struttura:

```json
[
  {
    "question_text": "Testo della domanda",
    "question_option": [
      {
        "option": "A",
        "option_text": "Testo opzione A"
      },
      {
        "option": "B", 
        "option_text": "Testo opzione B"
      }
    ],
    "answer_option": "A",
    "answer_option_text": "Spiegazione della risposta corretta (opzionale)"
  }
]
```

## Come eseguire l'applicazione

### Metodo 1: Server HTTP semplice con Python

```powershell
# Naviga nella cartella del progetto
cd "C:\Users\pctopcall10\Desktop\ISTQB"

# Avvia un server HTTP locale (Python 3)
python -m http.server 8000

# Oppure con Python 2
python -m SimpleHTTPServer 8000
```

Poi apri il browser e vai su `http://localhost:8000`

### Metodo 2: Server HTTP con Node.js

```powershell
# Installa http-server globalmente (se non già installato)
npm install -g http-server

# Naviga nella cartella del progetto
cd "C:\Users\pctopcall10\Desktop\ISTQB"

# Avvia il server
http-server -p 8000

# Oppure usa npx senza installazione globale
npx http-server -p 8000
```

Poi apri il browser e vai su `http://localhost:8000`

### Metodo 3: Estensione Live Server per VS Code

1. Installa l'estensione "Live Server" in VS Code
2. Apri la cartella del progetto in VS Code
3. Fai clic destro su `index.html` e seleziona "Open with Live Server"

### Metodo 4: Apertura diretta (limitata)

```powershell
# Apri direttamente il file HTML nel browser
start "C:\Users\pctopcall10\Desktop\ISTQB\index.html"
```

**Nota**: L'apertura diretta potrebbe non funzionare completamente a causa delle restrizioni CORS per il caricamento dei file JSON.

## Funzionalità avanzate

### Salvataggio stato
- L'applicazione salva automaticamente lo stato del quiz ogni 30 secondi
- Gli stati salvati scadono dopo 24 ore
- Possibilità di riprendere quiz interrotti

### Validazione dati
- Validazione completa dei file JSON
- Gestione elegante di file malformati o mancanti
- Notifiche non intrusive per errori di validazione

### Performance
- Gestione ottimizzata per quiz con oltre 200 domande
- Rendering lazy per mantenere l'applicazione reattiva

### Accessibilità
- Navigazione completa da tastiera (frecce, numeri 1-5)
- Etichette ARIA appropriate
- Supporto per screen reader
- Design responsive per dispositivi mobili

## Palette colori

- **Nero**: #000000 (testo principale, bordi)
- **Bianco**: #ffffff (background principale)
- **Rosso**: #c0392b (timer, errori, pulsante submit)
- **Verde**: #27ae60 (successo, passa)
- **Blu**: #2980b9 (pulsanti primari, collegamenti)

## Browser supportati

- Chrome/Edge 80+
- Firefox 75+
- Safari 13+

## Limitazioni

- Richiede un server HTTP per il caricamento completo dei file JSON
- I file JSON devono essere nella cartella `json_Q_A/` relativa alla radice dell'applicazione
- Il localStorage è utilizzato per salvare lo stato (limitazioni di quota del browser)

## Sviluppo e test

L'applicazione è progettata per essere facilmente testabile:
- Funzioni di utilità esportate in `utils.js`
- Logica di grading isolata e testabile
- Gestione degli errori robusta
- Codice modulare e commentato
