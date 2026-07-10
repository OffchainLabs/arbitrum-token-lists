import { coreCommands, getOrbitCommands } from './commandSets';

(async () => {
  const orbitCommands = await getOrbitCommands();

  console.log(`core=${JSON.stringify({ include: coreCommands })}`);
  console.log(`orbit=${JSON.stringify({ include: orbitCommands })}`);
})();
