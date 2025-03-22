import { config } from 'dotenv';
import morgan from 'morgan';
import cors from 'cors';

config();

import './config/database';
import express, { json } from 'express';

// Authentication
import verifyToken from './middleware/verify-token';

// Controllers
import testJWTRouter from './controllers/test-jwt';
import usersRouter from './controllers/users';
import profilesRouter from './controllers/profiles';
import ticketsRouter from './controllers/tickets.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(morgan('dev'));
app.use(json());

// Routes
app.use('/test-jwt', testJWTRouter);
app.use('/users', usersRouter);


// Tickets
app.use('/tickets', ticketsRouter);


// Protected Routes
app.use(verifyToken)
app.use('/profiles', profilesRouter);

app.listen(PORT, () => {
  console.log('The express app is ready!');
});
