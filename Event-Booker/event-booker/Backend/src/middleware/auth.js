// Importerar JWT utilities och User model
const { verifyToken, extractTokenFromHeader } = require('../utils/jwt');
const User = require('../models/User');

/**
 * Middleware för att autentisera användare
 * Kontrollerar JWT token och lägger till användarinfo i req.user
 */
const authenticate = async (req, res, next) => {
  try {
    // Hämtar token från Authorization header eller cookies
    let token = extractTokenFromHeader(req.headers.authorization);
    
    // Om ingen token i header, kolla cookies
    if (!token && req.cookies && req.cookies.authToken) {
      token = req.cookies.authToken;
    }

    // Om fortfarande ingen token finns
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Åtkomst nekad. Ingen token tillhandahållen.'
      });
    }

    // Verifierar token och får decoded payload
    const decoded = verifyToken(token);

    // Hämtar användare från databasen baserat på token payload
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token är giltig men användare hittades inte.'
      });
    }

    // Kontrollerar om användarkontot är aktivt
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Användarkonto är inaktiverat.'
      });
    }

    // Lägger till användarinfo i request objektet för användning i nästa middleware/route
    req.user = {
      id: user._id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive
    };

    // Fortsätter till nästa middleware eller route handler
    next();

  } catch (error) {
    console.error('Authentication error:', error.message);
    
    return res.status(401).json({
      success: false,
      message: 'Ogiltig token.',
      error: error.message
    });
  }
};

/**
 * Middleware för att kontrollera användarroller
 * @param {Array} roles - Array av tillåtna roller ['admin', 'user']
 * @returns {Function} - Middleware funktion
 */
const authorize = (roles = []) => {
  return (req, res, next) => {
    // Kontrollerar att användare är autentiserad först
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Användare inte autentiserad. Kör authenticate middleware först.'
      });
    }

    // Om inga specifika roller krävs, tillåt alla autentiserade användare
    if (roles.length === 0) {
      return next();
    }

    // Kontrollerar om användarens roll finns i tillåtna roller
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Åtkomst nekad. Kräver en av följande roller: ${roles.join(', ')}`
      });
    }

    next();
  };
};

/**
 * Middleware för admin-endast routes
 * Kortare version av authorize(['admin'])
 */
const requireAdmin = authorize(['admin']);

/**
 * Middleware för att kontrollera om användare äger resurs eller är admin
 * @param {String} resourceField - Fält i req.params som innehåller resource ID
 * @returns {Function} - Middleware funktion
 */
const requireOwnershipOrAdmin = (resourceField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Användare inte autentiserad.'
      });
    }

    const resourceUserId = req.params[resourceField];
    
    // Admin kan komma åt allt
    if (req.user.role === 'admin') {
      return next();
    }

    // Användare kan bara komma åt sina egna resurser
    if (req.user.id.toString() !== resourceUserId) {
      return res.status(403).json({
        success: false,
        message: 'Åtkomst nekad. Du kan bara komma åt dina egna resurser.'
      });
    }

    next();
  };
};

/**
 * Middleware för optional authentication
 * Lägger till user info om token finns, men kräver inte inloggning
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token = extractTokenFromHeader(req.headers.authorization);
    
    if (!token && req.cookies && req.cookies.authToken) {
      token = req.cookies.authToken;
    }

    // Om ingen token finns, fortsätt utan att sätta req.user
    if (!token) {
      return next();
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id);
    
    if (user && user.isActive) {
      req.user = {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive
      };
    }

    next();

  } catch (error) {
    // Vid fel med optional auth, fortsätt bara utan user info
    console.error('Optional auth error:', error.message);
    next();
  }
};

// Exporterar alla middleware funktioner
module.exports = {
  authenticate,
  authorize,
  requireAdmin,
  requireOwnershipOrAdmin,
  optionalAuth
};
/*Viktiga koncept:

MIDDLEWARE CHAIN: authenticate → authorize → route handler
REQ.USER: Lägger till användarinfo i request objektet
ROLE-BASED ACCESS: Olika behörigheter för user/admin
OWNERSHIP: Användare kan bara redigera sina egna resurser
*/
