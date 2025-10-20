// Importerar mongoose för databas schema och bcryptjs för lösenordshashing
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Definierar User schema - strukturen för användardokument i MongoDB
const userSchema = new mongoose.Schema({
  // Användarnamn - måste vara unikt i hela databasen
  username: {
    type: String,
    required: [true, 'Användarnamn är obligatoriskt'],
    unique: true,
    trim: true,
    minlength: [3, 'Användarnamn måste vara minst 3 tecken'],
    maxlength: [30, 'Användarnamn får max vara 30 tecken'],
  },

  // Email adress för inloggning och kommunikation
  email: {
    type: String,
    required: [true, 'Email är obligatoriskt'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Ange en giltig email adress'
    ]
  },

  // Lösenord - kommer att hashas innan det sparas
  password: {
    type: String,
    required: [true, 'Lösenord är obligatoriskt'],
    minlength: [6, 'Lösenord måste vara minst 6 tecken'],
    select: false // Lösenord inkluderas INTE automatiskt i queries
  },

  // Användarroll för behörighetskontroll
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },

  firstName: {
    type: String,
    required: [true, 'Förnamn är obligatoriskt'],
    trim: true,
    maxlength: [50, 'Förnamn får max vara 50 tecken']
  },

  lastName: {
    type: String,
    required: [true, 'Efternamn är obligatoriskt'],
    trim: true,
    maxlength: [50, 'Efternamn får max vara 50 tecken']
  },

  isActive: {
    type: Boolean,
    default: true
  },

  lastLogin: {
    type: Date
  }

}, {
  timestamps: true, // Lägger automatiskt till createdAt och updatedAt
});

// PRE-SAVE MIDDLEWARE - Hashar lösenordet före sparning
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// INSTANCE METHOD - Jämför lösenord
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Exporterar User model
module.exports = mongoose.model('User', userSchema);
