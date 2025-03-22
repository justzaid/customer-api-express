const express = require('express');
const verifyToken = require('../middleware/verify-token.js');
const Ticket = require('../models/ticket.js');
const router = express.Router();

// ========== Public Routes ===========

router.get('/', async (req, res) => {
    try {
      const tickets = await Ticket.find({}).populate('author').sort({ createdAt: 'desc' });
      res.status(200).json(tickets);
    } catch (error) {
      res.status(500).json(error);
    }
  });

router.get('/:ticketId', async (req, res) => {
try {
const ticket = await Ticket.findById(req.params.ticketId).populate(['author','reviews.author',]);
res.status(200).json(ticket);
} catch (error) {
res.status(500).json(error);
}
});

// ========= Protected Routes =========

router.use(verifyToken);

router.post('/', async (req, res) => {
    try {
      req.body.author = req.user._id;
      const ticket = await Ticket.create(req.body);
      ticket._doc.author = req.user;
      res.status(201).json(ticket);
    } catch (error) {
      console.log(error);
      res.status(500).json(error);
    }
});

router.put('/:ticketId', async (req, res) => {
try {
    // Find the Ticket:
    const ticket = await Ticket.findById(req.params.ticketId);

    // Check permissions:
    if (!ticket.author.equals(req.user._id)) {
    return res.status(403).send("You're not allowed to do that!");
    }

    // Update ticket:
    const updatedTicket = await Ticket.findByIdAndUpdate(
    req.params.ticketId,
    req.body,
    { new: true }
    );

    // Append req.user to the author property:
    updatedTicket._doc.author = req.user;

    // Issue JSON response:
    res.status(200).json(updatedTicket);
} catch (error) {
    res.status(500).json(error);
}
});

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

router.delete('/:ticketId/reviews/:reviewId', async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.ticketId);
    ticket.reviews.remove({ _id: req.params.reviewId });
    await ticket.save();
    res.status(200).json({ message: 'Review has been succesfully removed.' });
  } catch (err) {
    res.status(500).json(err);
  }
});

router.put('/:ticketId/reviews/:reviewId', async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.ticketId);
    const review = ticket.reviews.id(req.params.reviewId);
    review.text = req.body.text;
    await ticket.save();
    res.status(200).json({ message: 'Review has been succesfully updated.' });
  } catch (err) {
    res.status(500).json(err);
  }
});


module.exports = router;