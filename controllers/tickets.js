const express = require('express');
const verifyToken = require('../middleware/verify-token.js');
const Ticket = require('../models/ticket.js');
const router = express.Router();

// ========= Protected Routes =========

router.use(verifyToken);



// Get all tickets for logged-in user, while admin sees all
router.get('/my-tickets', async (req, res) => {
  try {
    const userId = req.user._id;
    let tickets;

    if (req.user.role === 'admin') {
      // Admin can view all tickets
      tickets = await Ticket.find({}).populate('customerId').sort({ createdAt: 'desc' });
    } else {
      // Normal user can only view their own tickets
      tickets = await Ticket.find({ customerId: userId }).populate('customerId').sort({ createdAt: 'desc' });
    }

    res.status(200).json(tickets);
  } catch (error) {
    res.status(500).json(error);
  }
});



// Get a specific ticket by ID for logged-in user while admin sees all
router.get('/my-tickets/:ticketId', async (req, res) => {
  try {
    const userId = req.user._id; // The logged-in user's ID
    const ticket = await Ticket.findById(req.params.ticketId).populate('customerId').populate('reviews.author');

    // Check if the ticket belongs to the logged-in user or if the user is an admin
    if (ticket.customerId._id.toString() !== userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: "You are not authorized to view this ticket" });
    }

    // Sort reviews by createdAt
    ticket.reviews.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    res.status(200).json(ticket);
  } catch (error) {
    res.status(500).json(error);
  }
});



// Post a new ticket
router.post('/', async (req, res) => {
    try {
      req.body.author = req.user._id;
      const ticket = await Ticket.create(req.body);
      ticket._doc.customerId = req.user;
      res.status(201).json(ticket);
    } catch (error) {
      console.log(error);
      res.status(500).json(error);
    }
});



// Update a ticket
router.put('/:ticketId', async (req, res) => {
try {
    // Find the Ticket:
    const ticket = await Ticket.findById(req.params.ticketId);

    // Check permissions:
    if (!ticket.customerId.equals(req.user._id)) {
    return res.status(403).send("You're not allowed to do that!");
    }

    // Update ticket:
    const updatedTicket = await Ticket.findByIdAndUpdate(
    req.params.ticketId,
    req.body,
    { new: true }
    );

    // Append req.user to the author property:
    updatedTicket._doc.customerId = req.user;

    // Issue JSON response:
    res.status(200).json(updatedTicket);
} catch (error) {
    res.status(500).json(error);
}
});



// Delete a Ticket
router.delete('/:ticketId', async (req, res) => {
    try {
      const ticket = await Ticket.findById(req.params.ticketId);
  
      if (!ticket.author.equals(req.user._id)) {
        return res.status(403).send("You're not allowed to do that!");
      }
  
      const deletedTicket = await Ticket.findByIdAndDelete(req.params.ticketId);
      res.status(200).json(deletedTicket);
    } catch (error) {
      res.status(500).json(error);
    }
});



// Post a ticket review
router.post('/:ticketId/reviews', async (req, res) => {
    try {
      req.body.author = req.user._id;
      const ticket = await Ticket.findById(req.params.ticketId);
      ticket.reviews.push(req.body);
      await ticket.save();
  
      // Find the newly created reviews:
      const newReview = ticket.reviews[ticket.reviews.length - 1];
  
      newReview._doc.author = req.user;
  
      // Respond with the newReview:
      res.status(201).json(newReview);
    } catch (error) {
      res.status(500).json(error);
    }
});



// Delete a review from a ticket
router.delete('/:ticketId/reviews/:reviewId', async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.ticketId);
    ticket.reviews.remove({ _id: req.params.reviewId });
    await ticket.save();
    res.status(200).json({ message: 'Review has been succesfully removed.' });
  } catch (error) {
    res.status(500).json(error);
  }
});



// Update a review on a ticket
router.put('/:ticketId/reviews/:reviewId', async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.ticketId);
    const review = ticket.reviews.id(req.params.reviewId);
    review.text = req.body.text;
    await ticket.save();
    res.status(200).json({ message: 'Review has been succesfully updated.' });
  } catch (error) {
    res.status(500).json(error);
  }
});


module.exports = router;