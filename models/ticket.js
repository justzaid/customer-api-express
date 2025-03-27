const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
    {
      author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      description: {
        type: String,
        required: true
      }
    },
    { timestamps: true }
  );

const ticketSchema = new mongoose.Schema(
    {
      customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      ticketId: { 
        type: String,
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
        enum: [
          'Delayed Flight',
          'Canceled Flight',
          'Missed Connection',
          'Lost Baggage',
          'Damaged Baggage',
          'Delayed Baggage',
          'Incorrect Booking Details',
          'Refund & Compensation',
          'Seat Assignment Issue',
          'Uncomfortable Seats',
          'Food & Catering Issue',
          'Restroom & Cleanliness',
          'Rude Staff',
          'Customer Service Complaint',
          'Online Check-in Problem',
          'App or Website Issue',
          'Disability Assistance',
          'Infant & Child Services',
          'Other',
        ],
      },
      status: {
        type: String,
        enum: ['Open', 'In progress', 'Resolved', 'Closed',],
        default: 'Open',
      },
      assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
      },
      reviews: {
        type: [reviewSchema],
        default: [],
      },
    },
    { timestamps: true }
  );

  const Ticket = mongoose.model('Ticket', ticketSchema);

  module.exports = Ticket;
