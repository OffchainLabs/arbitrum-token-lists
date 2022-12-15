import express from 'express';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';

const app = express();
dotenv.config();
const port = process.env.PORT || 8080;

app.get('/', (_, res) => {
  res.send('ping');
});

app.get('/all_tokens', (_, res) => {
  const tokenData = readFileSync('./src/FullList/all_tokens.json');

  res.send(JSON.parse(tokenData.toString()));
});

app.listen(port, () => {
  console.log(`server started at port ${port}`);
});
