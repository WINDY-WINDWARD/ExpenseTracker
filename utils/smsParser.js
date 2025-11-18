/**
 * SMS Parser Utility
 * Parses transaction SMS messages from banks and UPI providers
 */

/**
 * Parse date from various formats to ISO string
 * @param {string} dateStr - Date string in various formats
 * @returns {string} ISO date string
 */
const parseDate = (dateStr) => {
  // Handle DD/MM/YY format (e.g., "18/11/25")
  const ddmmyyMatch = dateStr.match(/(\d{2})\/(\d{2})\/(\d{2})/);
  if (ddmmyyMatch) {
    const [, day, month, year] = ddmmyyMatch;
    const fullYear = `20${year}`;
    return new Date(`${fullYear}-${month}-${day}`).toISOString();
  }

  // Handle DD MMM YYYY format (e.g., "31 OCT 2025")
  const ddmmmyyyyMatch = dateStr.match(/(\d{2})\s+([A-Z]{3})\s+(\d{4})/);
  if (ddmmmyyyyMatch) {
    const [, day, month, year] = ddmmmyyyyMatch;
    const monthMap = {
      JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
      JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12'
    };
    return new Date(`${year}-${monthMap[month]}-${day}`).toISOString();
  }

  // Default to current date if parsing fails
  return new Date().toISOString();
};

/**
 * Parse UPI transaction SMS
 * Example: "Sent Rs.299.00 from HDFC Bank A/c 1263 To Google Play 18/11/25"
 */
const parseUPISent = (message) => {
  const regex = /Sent Rs\.?([\d,]+\.?\d*)\s+(?:from|From).*?(?:to|To)\s+(.*?)\s+(?:on|On)?\s*(\d{2}\/\d{2}\/\d{2})/is;
  const match = message.match(regex);
  
  if (match) {
    const [, amount, merchant, date] = match;
    return {
      amount: parseFloat(amount.replace(/,/g, '')),
      type: 'expense',
      date: parseDate(date),
      merchant: merchant.trim(),
      category: 'UPI Payment',
      source: 'SMS'
    };
  }
  return null;
};

/**
 * Parse Credit Card transaction SMS
 * Example: "Transaction Successful! INR 867.00 spent on your IDFC FIRST Bank Credit Card ending XX1142 at ZOMATO on 31 OCT 2025"
 */
const parseCreditCardSpent = (message) => {
  const regex = /(?:Transaction Successful!|Delicious Purchase!|Happy Shopping!).*?INR\s+([\d,]+\.?\d*)\s+spent.*?at\s+(.*?)\s+on\s+(\d{2}\s+[A-Z]{3}\s+\d{4})/is;
  const match = message.match(regex);
  
  if (match) {
    const [, amount, merchant, date] = match;
    return {
      amount: parseFloat(amount.replace(/,/g, '')),
      type: 'expense',
      date: parseDate(date),
      merchant: merchant.trim(),
      category: 'Credit Card',
      source: 'SMS'
    };
  }
  return null;
};

/**
 * Parse E-Mandate/Auto-debit SMS
 * Example: "Rs.299.00 will be deducted on 15/11/25, 00:00:00 For GOOGLE INDIA DIGITAL SERVICES"
 */
const parseEMandate = (message) => {
  const regex = /Rs\.?([\d,]+\.?\d*)\s+will be deducted.*?(?:on|On)\s+(\d{2}\/\d{2}\/\d{2}).*?(?:for|For)\s+(.*?)(?:mandate|UMN)/is;
  const match = message.match(regex);
  
  if (match) {
    const [, amount, date, merchant] = match;
    return {
      amount: parseFloat(amount.replace(/,/g, '')),
      type: 'expense',
      date: parseDate(date),
      merchant: merchant.trim(),
      category: 'Auto-debit',
      source: 'SMS'
    };
  }
  return null;
};

/**
 * Main parser function - tries all patterns
 * @param {string} messageBody - SMS message body
 * @returns {Object|null} Parsed transaction object or null
 */
export const parseSMS = (messageBody) => {
  if (!messageBody || typeof messageBody !== 'string') {
    return null;
  }

  // Try each parser in order
  const parsers = [
    parseUPISent,
    parseCreditCardSpent,
    parseEMandate
  ];

  for (const parser of parsers) {
    const result = parser(messageBody);
    if (result) {
      return result;
    }
  }

  return null;
};

/**
 * Parse multiple SMS messages
 * @param {Array<string>} messages - Array of SMS message bodies
 * @returns {Array<Object>} Array of parsed transactions
 */
export const parseSMSBatch = (messages) => {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages
    .map(msg => parseSMS(msg))
    .filter(result => result !== null);
};

export default {
  parseSMS,
  parseSMSBatch
};
