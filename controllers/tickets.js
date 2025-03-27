const express = require('express');
const { v4: uuidv4 } = require('uuid');
const verifyToken = require('../middleware/verify-token.js');
const Ticket = require('../models/ticket.js');
const User = require('../models/user.js');
const router = express.Router();

const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Forbidden: Requires admin privileges' });
  }
};

router.use(verifyToken);

router.get('/my-tickets', async (req, res) => {
  try {
    const userId = req.user._id;
    let tickets;

    if (req.user.role === 'admin') {
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
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

router.get('/my-tickets/:ticketId', async (req, res) => {
  try {
    const userId = req.user._id;

    const ticket = await Ticket.findById(req.params.ticketId)
      .populate('customerId', 'username email _id')
      .populate('reviews.author', 'username email _id')
      .populate('assignedTo', 'username email _id');
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    if (ticket.customerId._id.toString() !== userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: "You are not authorized to view this ticket" });
    }

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
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

router.post('/', async (req, res) => {
    try {
      req.body.customerId = req.user._id;
      req.body.ticketId = uuidv4(); 
      const { subject, description, category, customerId, ticketId } = req.body; 
      const ticket = await Ticket.create({ subject, description, category, customerId, ticketId });
      const populatedTicket = await Ticket.findById(ticket._id).populate('customerId', 'username email');
      res.status(201).json(populatedTicket);
    } catch (error) {
      res.status(500).json(error);
    }
});

router.put('/:ticketId', async (req, res) => {
try {
    const ticket = await Ticket.findById(req.params.ticketId);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    if (!ticket.customerId.equals(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).send("You're not allowed to do that!");
    }

    const allowedUpdates = req.body;

    const updatedTicket = await Ticket.findByIdAndUpdate(
      req.params.ticketId,
      allowedUpdates,
      { new: true }
    ).populate('customerId', 'username email _id')
     .populate('assignedTo', 'username email _id')
     .populate('reviews.author', 'username email _id');

  
    if (updatedTicket.reviews) {
      updatedTicket.reviews.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    }
    res.status(200).json(updatedTicket);
} catch (error) {
    res.status(500).json(error);
}
});


router.delete('/:ticketId', async (req, res) => {
    try {
      const ticket = await Ticket.findById(req.params.ticketId);
      if (!ticket) {
        return res.status(404).json({ message: 'Ticket not found' });
      }
      if (!ticket.customerId.equals(req.user._id) && req.user.role !== 'admin') {
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

      const newReview = ticket.reviews[ticket.reviews.length - 1];
  
      newReview._doc.author = req.user;
  
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
  } catch (error) {
    res.status(500).json(error);
  }
});


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
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

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
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

router.get('/stats', isAdmin, async (req, res) => {
  try {
    const groupBy = ['day', 'week', 'month'].includes(req.query.groupBy) ? req.query.groupBy : 'day';
    let groupFormat;
    let sortOrder = { _id: 1 };

    switch (groupBy) {
      case 'month':
        groupFormat = '%Y-%m';
        break;
      case 'week':
        groupFormat = '%Y-%U';
        break;
      case 'day':
      default:
        groupFormat = '%Y-%m-%d';
        break;
    }

    const stats = await Ticket.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: groupFormat, date: '$createdAt', timezone: 'UTC' } }, // Added timezone
          count: { $sum: 1 },
        },
      },
      { $sort: sortOrder },
    ]);
    const labels = stats.map(stat => stat._id);
    const data = stats.map(stat => stat.count);

    res.status(200).json({ labels, data });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});


module.exports = router;
