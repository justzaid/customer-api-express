const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const reviewSchema = new mongoose.Schema(
    {
      text: {
        type: String,
        required: true
      },
      author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    },
    { timestamps: true }
  );

const ticketSchema = new mongoose.Schema(
    {
      ticketId: {
        type: String,
        default: uuidv4,
        unique: true,
        required: true,
      },
      customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      subject: {
        type: String,
        required: true,
      },
      description: {
        type: String,
        required: true,
      },
      category: {
        type: String,
        required: true,
        enum: ['Tickets', 'Customer Service', 'Airplane Seats', 'Catering', 'Baggage', 'Flight experience', 'Technical Issue',],
      },
      status: {
        type: String,
        enum: ['Open', 'In progress', 'Resolved', 'Closed',],
        default: 'Open',
      },
      createdAt: {
        type: Date,
        default: Date.now
      },
      resolvedAt: {
        type: Date,
        default: null
      },
      assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'admin',
        default: null
      },
      author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      reviews: [reviewSchema],
    },
    { timestamps: true }
  );

  const Ticket = mongoose.model('Ticket', ticketSchema);

  module.exports = Ticket;