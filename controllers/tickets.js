const express = require('express');
const { v4: uuidv4 } = require('uuid');
const verifyToken = require('../middleware/verify-token.js');
const Ticket = require('../models/ticket.js');
const User = require('../models/user.js');
const router = express.Router();

// Middleware to check for admin role
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Forbidden: Requires admin privileges' });
  }
};

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
      tickets = await Ticket.find({ customerId: userId })
        .populate('customerId', 'username email _id')
        .populate('assignedTo', 'username email _id')
        .sort({ createdAt: 'desc' });
    }

    res.status(200).json(tickets);
  } catch (error) {
    res.status(500).json(error);
  }
});

router.get('/all', isAdmin, async (req, res) => {
  try {
    const tickets = await Ticket.find({})
      .populate({
        path: 'customerId',
        select: 'username email _id',
      })
      .populate({
        path: 'assignedTo',
        select: 'username email _id',
      })
      .sort({ createdAt: 'desc' });

    const transformedTickets = tickets.map(ticket => {
      const ticketObject = ticket.toObject();
      ticketObject.user = ticketObject.customerId;
      delete ticketObject.customerId;
      return ticketObject;
    });

    res.status(200).json(transformedTickets);
  } catch (error) {
    console.error('Error fetching all tickets:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});


// Get a specific ticket by ID for logged-in user while admin sees all
router.get('/my-tickets/:ticketId', async (req, res) => {
  try {
    const userId = req.user._id;

    const ticket = await Ticket.findById(req.params.ticketId)
      .populate('customerId', 'username email _id')
      .populate('reviews.author', 'username email _id')
      .populate('assignedTo', 'username email _id');

    // Check if ticket exists
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Check if the ticket belongs to the logged-in user or if the user is an admin
    if (ticket.customerId._id.toString() !== userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: "You are not authorized to view this ticket" });
    }

    // Sort reviews by createdAt
    if (ticket.reviews) {
      ticket.reviews.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    }

    let ticketObject = ticket.toObject();

    if (!ticketObject.assignedTo) {
      const managingAdmin = await User.findOne({ role: 'admin' }).select('username email _id');
      if (managingAdmin) {
        ticketObject.managingAdmin = managingAdmin.toObject();
      }
    }

    res.status(200).json(ticketObject);
  } catch (error) {
    console.error('Error fetching ticket by ID:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});



// Post a new ticket
router.post('/', async (req, res) => {
    try {
      // Assign the logged-in user's ID to the customerId field
      req.body.customerId = req.user._id;
      // Generate a unique ticketId using uuid
      req.body.ticketId = uuidv4(); 
      const { subject, description, category, customerId, ticketId } = req.body; 
      const ticket = await Ticket.create({ subject, description, category, customerId, ticketId });
      const populatedTicket = await Ticket.findById(ticket._id).populate('customerId', 'username email');
      res.status(201).json(populatedTicket);
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

      // Check if ticket exists
      if (!ticket) {
        return res.status(404).json({ message: 'Ticket not found' });
      }
  
      // Check permissions: User must be the customer who created the ticket OR an admin
      if (!ticket.customerId.equals(req.user._id) && req.user.role !== 'admin') {
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

// Assign a ticket to the requesting admin
router.put('/:ticketId/assign', isAdmin, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.ticketId);

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    ticket.assignedTo = req.user._id;
    await ticket.save();

    const populatedTicket = await Ticket.findById(ticket._id)
      .populate({ path: 'customerId', select: 'username email _id' })
      .populate({ path: 'assignedTo', select: 'username email _id' });

    const ticketObject = populatedTicket.toObject();
    ticketObject.user = ticketObject.customerId;
    delete ticketObject.customerId;

    res.status(200).json(ticketObject);
  } catch (error) {
    console.error('Error assigning ticket:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// Get tickets assigned to the logged-in admin
router.get('/assigned-to-me', isAdmin, async (req, res) => {
  try {
    const adminId = req.user._id;
    const tickets = await Ticket.find({ assignedTo: adminId })
      .populate({
        path: 'customerId',
        select: 'username email _id',
      })
      .populate({
        path: 'assignedTo',
        select: 'username email _id',
      })
      .sort({ createdAt: 'desc' });

    const transformedTickets = tickets.map(ticket => {
      const ticketObject = ticket.toObject();
      ticketObject.user = ticketObject.customerId;
      delete ticketObject.customerId;
      return ticketObject;
    });

    res.status(200).json(transformedTickets);
  } catch (error) {
    console.error('Error fetching assigned tickets:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});


module.exports = router;
