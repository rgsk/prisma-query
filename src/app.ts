import express from 'express';

const app = express();

app.get('/', (req, res) => {
  res.json({
    message: 'Prisma Query API is running',
  });
});

export default app;
