import { start } from "./start"

start()
  .then(() => console.log('Done.'))
  .catch(err => {
    console.error(err);
    throw err;
  });