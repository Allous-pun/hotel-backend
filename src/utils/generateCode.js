// src/utils/generateCode.js

function generateCode(prefix = "GEN") {
  const random = Math.floor(10000 + Math.random() * 90000); // 5-digit random number
  const timestamp = Date.now().toString().slice(-4); // last 4 digits of timestamp for extra uniqueness
  return `${prefix}-${random}${timestamp}`;
}

module.exports = generateCode;
