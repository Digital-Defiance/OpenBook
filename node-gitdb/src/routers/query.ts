import express from 'express';

export const queryRouter = express.Router();

queryRouter.get('/', (req, res) => {
    res.send({ message: 'Hello API' });
});

export default queryRouter;