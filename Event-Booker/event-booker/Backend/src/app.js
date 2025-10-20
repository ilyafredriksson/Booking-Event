// Importerar nödvändiga npm paket för servern
const express = require('express'); // Web framework för Node.js
const cors = require('cors'); // Cross-Origin Resource Sharing middleware
const helmet = require('helmet'); // Säkerhetsheaders middleware
const morgan = require('morgan'); // HTTP request logger
const rateLimit = require('express-rate-limit'); // Rate limiting middleware
require('dotenv').config(); // Laddar miljövariabler från .env fil
const connectDB = require('./config/database'); // Importerar databasanslutning

// Skapar Express applikation instans
const app = express();

// Ansluter till MongoDB databas när servern startar
connectDB();

// MIDDLEWARE KEDJA - körs i ordning för varje HTTP request

// Säkerhetsmiddleware som lägger till HTTP headers för att skydda mot sårbarheter
app.use(helmet());
// Rate limiting för att begränsa antal requests per IP-adress
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // Tidsfönster i millisekunder (15 minuter)
  max: 100, // Maximum antal requests per IP per tidsfönster
  message: 'För många request från denna IP, försök igen efter 15 minuter',
});
// Applicerar rate limiting på alla routes
app.use(limiter);
// CORS konfiguration för att tillåta cross-origin requests från frontend
app.use(cors({
    // Tillåter olika origins beroende på miljö (dev vs production)
    origin: process.env.NODE_ENV === 'production'
        ? 'https://your-production-domain.com' // Produktions-URL
        : 'http://localhost:5173', // Vite development server
    credentials: true, // Tillåter cookies och credentials i requests
}));

// HTTP request logging enbart i development miljö
if(process.env.NODE_ENV === 'development') {
    app.use(morgan('dev')); // Loggar requests i färgkodad dev-format
}

// Body parsing middleware för att läsa JSON data från requests
app.use(express.json({limit: '10kb'})); // Begränsar JSON body till 10kb för säkerhet

// URL-encoded body parsing för formulärdata
app.use(express.urlencoded({ extended: true })); // extended: true tillåter rika objekt

// API ROUTES

// Health check endpoint för att kontrollera att servern fungerar
app.get('/api/health', (req, res) => {
    res.status(200).json({ 
        success: true,
        message: 'server fungerar',
        uptime: process.uptime(), // Hur länge servern varit igång i sekunder
        time: new Date().toISOString() // Aktuell timestamp
     });
});

// ERROR HANDLING MIDDLEWARE - måste vara efter alla routes

// Global error handler för alla fel i applikationen
app.use((err, req, res, next) => {
    console.error(err.stack); // Loggar fel för debugging
    res.status(500).json({
        success: false,
        message: 'Något gick fel på servern',
    });
});

// 404 handler för routes som inte existerar - måste vara sist
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} finns inte på servern`,
    });
});

// SERVER KONFIGURATION

// Läser port från miljövariabel eller använder 5000 som default
const PORT = process.env.PORT || 5000;

// Startar HTTP servern och lyssnar på specificerad port
app.listen(PORT, () => {
    console.log(`Server körs på port ${PORT} i ${process.env.NODE_ENV} läge`);
    console.log(`API endpoint: http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
});

// Exporterar app för testning eller användning i andra moduler
module.exports = app;
