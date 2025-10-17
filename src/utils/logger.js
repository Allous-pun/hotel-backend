const info = (message) => console.log(`ℹ️  ${message}`);
const success = (message) => console.log(`✅  ${message}`);
const warn = (message) => console.warn(`⚠️  ${message}`);
const error = (message) => console.error(`❌  ${message}`);

module.exports = { info, success, warn, error };
