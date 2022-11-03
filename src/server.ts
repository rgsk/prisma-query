import app from 'app';

import environmentVars from 'constants/environmentVars';

const PORT = environmentVars.PORT;

const server = app.listen(PORT, () => {
  console.log(`listening on http://localhost:${PORT}`);
});
