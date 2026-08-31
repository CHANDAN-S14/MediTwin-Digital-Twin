const stamp = () => new Date().toISOString();

const write = (level, args) => {
  const line = `${stamp()} [${level}]`;
  if (level === 'error') console.error(line, ...args);
  else if (level === 'warn') console.warn(line, ...args);
  else console.log(line, ...args);
};

export const logger = {
  info: (...a) => write('info', a),
  warn: (...a) => write('warn', a),
  error: (...a) => write('error', a),
  debug: (...a) => { if (process.env.NODE_ENV !== 'production') write('debug', a); },
};

export default logger;
