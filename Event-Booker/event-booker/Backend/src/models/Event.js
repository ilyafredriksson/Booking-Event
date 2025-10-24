const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Titel är obligatorisk'],
    trim: true,
    maxlength: [100, 'Titel får max vara 100 tecken']
  },
  description: {
    type: String,
    required: [true, 'Beskrivning är obligatorisk'],
    maxlength: [1000, 'Beskrivning får max vara 1000 tecken']
  },
  date: {
    type: Date,
    required: [true, 'Datum är obligatoriskt'],
    validate: {
      validator: function(value) {
        return value > new Date();
      },
      message: 'Datum måste vara i framtiden'
    }
  },
  location: {
    type: String,
    required: [true, 'Plats är obligatorisk'],
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'Pris är obligatoriskt'],
    min: [0, 'Pris kan inte vara negativt']
  },
  capacity: {
    type: Number,
    required: [true, 'Kapacitet är obligatorisk'],
    min: [1, 'Kapacitet måste vara minst 1']
  },
  bookedSeats: {
    type: Number,
    default: 0,
    min: [0, 'Bokade platser kan inte vara negativa']
  },
  category: {
    type: String,
    required: [true, 'Kategori är obligatorisk'],
    enum: ['konserter', 'sport', 'teater', 'utbildning', 'annat']
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Virtual för tillgängliga platser
eventSchema.virtual('availableSeats').get(function() {
  return this.capacity - this.bookedSeats;
});

// Middleware för att kontrollera kapacitet
eventSchema.pre('save', function(next) {
  if (this.bookedSeats > this.capacity) {
    return next(new Error('Bokade platser kan inte överstiga kapacitet'));
  }
  next();
});

module.exports = mongoose.model('Event', eventSchema);