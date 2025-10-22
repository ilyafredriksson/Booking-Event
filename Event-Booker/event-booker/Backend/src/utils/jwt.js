// Importerar jsonwebtoken för att skapa och verifiera JWT tokens
const jwt = require('jsonwebtoken');

/**
 * Genererar en JWT token för en användare
 * @param {Object} payload - Data som ska inkluderas i token (vanligtvis user ID och role)
 * @returns {String} - JWT token som sträng
 */
const generateToken = (payload) => {
  // Skapar JWT token med payload, secret från .env och expiration time
  return jwt.sign(
    payload, // Data som ska finnas i token (user id, role etc.)
    process.env.JWT_SECRET, // Hemlig nyckel från miljövariabel
    {
      expiresIn: process.env.JWT_EXPIRE || '7d', // Token giltighetstid
      issuer: 'event-booker-api', // Vem som utfärdade token
      audience: 'event-booker-users' // Vem token är avsedd för
    }
  );
};

/**
 * Verifierar en JWT token och returnerar decoded payload
 * @param {String} token - JWT token som ska verifieras
 * @returns {Object} - Decoded payload från token
 * @throws {Error} - Om token är ogiltig eller utgången
 */
const verifyToken = (token) => {
  try {
    // Verifierar token med samma secret som användes för att skapa den
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'event-booker-api',
      audience: 'event-booker-users'
    });
    
    return decoded;
  } catch (error) {
    // Olika typer av JWT fel
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token har gått ut');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Ogiltig token');
    } else if (error.name === 'NotBeforeError') {
      throw new Error('Token är inte giltig än');
    } else {
      throw new Error('Token verifiering misslyckades');
    }
  }
};

/**
 * Extraherar token från Authorization header
 * @param {String} authHeader - Authorization header värde
 * @returns {String|null} - Token om den finns, annars null
 */
const extractTokenFromHeader = (authHeader) => {
  // Kontrollerar om header finns och börjar med "Bearer "
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // Returnerar token delen efter "Bearer "
    return authHeader.substring(7);
  }
  return null;
};

/**
 * Skapar en komplett token response för användare
 * @param {Object} user - User objekt från databasen
 * @returns {Object} - Objekt med token och user info
 */
const createTokenResponse = (user) => {
  // Skapar payload med viktig användarinfo (INTE lösenord)
  const payload = {
    id: user._id,
    email: user.email,
    username: user.username,
    role: user.role
  };

  // Genererar token med payload
  const token = generateToken(payload);

  return {
    token,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt
    }
  };
};

/**
 * Middleware helper för att sätta token i cookie
 * @param {Object} res - Express response object
 * @param {String} token - JWT token
 */
const setTokenCookie = (res, token) => {
  const cookieOptions = {
    httpOnly: true, // Cookie kan bara läsas av servern, inte JavaScript
    secure: process.env.NODE_ENV === 'production', // HTTPS only i produktion
    sameSite: 'strict', // CSRF protection
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dagar i millisekunder
  };

  res.cookie('authToken', token, cookieOptions);
};

/**
 * Tar bort auth cookie
 * @param {Object} res - Express response object
 */
const clearTokenCookie = (res) => {
  res.clearCookie('authToken');
};

// Exporterar alla funktioner för användning i andra moduler
module.exports = {
  generateToken,
  verifyToken,
  extractTokenFromHeader,
  createTokenResponse,
  setTokenCookie,
  clearTokenCookie
};