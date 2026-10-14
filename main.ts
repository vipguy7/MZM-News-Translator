import 'dotenv/config';
import { createApp } from './server.ts';

const port = Number(process.env.PORT || 3000);

if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error(`PORT must be an integer between 1024 and 65535. Received: ${process.env.PORT || '<unset>'}`);
}

async function start() {
  const app = await createApp();

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
