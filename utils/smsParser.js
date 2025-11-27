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

  // Handle DD-MMM-YY format (e.g., "23-OCT-25" or "16-11-25")
  const ddmmmyyMatch = dateStr.match(/(\d{2})-(\d{2}|[A-Z]{3})-(\d{2})/);
  if (ddmmmyyMatch) {
    const [, day, monthOrNum, year] = ddmmmyyMatch;
    const fullYear = `20${year}`;
    const monthMap = {
      JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
      JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12'
    };
    const month = monthMap[monthOrNum] || monthOrNum;
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
 * Extract account information from SMS message
 * @param {string} message - SMS message body
 * @returns {Object|null} - { accountNumber, bankName, accountType } or null
 */
const extractAccountInfo = (message) => {
  if (!message) return null;

  // Pattern for savings account: "HDFC Bank A/c XX1263" or "A/c XX1263"
  const savingsMatch = message.match(/(?:([A-Z\s]+Bank)\s+)?A\/c\s+(?:XX)?(\d{4})/i);
  if (savingsMatch) {
    return {
      accountNumber: savingsMatch[2],
      bankName: savingsMatch[1]?.trim() || extractBankName(message),
      accountType: 'savings'
    };
  }

  // Pattern for credit card: "card ending 8656" or "Credit Card ending XX1142"
  const creditCardMatch = message.match(/(?:([A-Z\s]+Bank)\s+)?(?:Credit\s+)?[Cc]ard(?:member)?\s+.*?ending\s+(?:XX)?(\d{4})/i);
  if (creditCardMatch) {
    return {
      accountNumber: creditCardMatch[2],
      bankName: creditCardMatch[1]?.trim() || extractBankName(message),
      accountType: 'credit_card'
    };
  }

  return null;
};

/**
 * Extract bank name from message context
 * @param {string} message - SMS message
 * @returns {string} - Bank name or 'Unknown Bank'
 */
const extractBankName = (message) => {
  const bankPatterns = [
    /HDFC\s+Bank/i,
    /IDFC\s+(?:FIRST\s+)?Bank/i,
    /ICICI\s+Bank/i,
    /SBI/i,
    /Axis\s+Bank/i
  ];

  for (const pattern of bankPatterns) {
    const match = message.match(pattern);
    if (match) return match[0];
  }

  return 'Unknown Bank';
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
      source: 'SMS',
      accountInfo: extractAccountInfo(message)
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
      source: 'SMS',
      accountInfo: extractAccountInfo(message)
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
      source: 'SMS',
      accountInfo: extractAccountInfo(message)
    };
  }
  return null;
};

/**
 * Parse NEFT/Salary Credit SMS
 * Example: "Update! INR 73,671.00 deposited in HDFC Bank A/c XX1263 on 23-OCT-25 for NEFT Cr-CITI0000002-NOKIA ACCOUNT FOR SALARY TRANSFER"
 */
const parseNEFTCredit = (message) => {
  const regex = /(?:INR|Rs\.?)\ s*([\ d,]+\.?\ d*)\ s+deposited.*?on\ s+(\ d{2}-[A-Z]{3}-\ d{2}).*?(?:for|Cr-)\ s*(.*?)(?:\.|Avl)/is;
  const match = message.match(regex);

  if (match) {
    const [, amount, date, description] = match;
    // Extract merchant/source from description
    let merchant = description.trim();
    // Try to extract meaningful part (e.g., "NOKIA ACCOUNT FOR SALARY TRANSFER")
    const merchantMatch = merchant.match(/(?:NEFT Cr-[^-]+-)?(.+)/);
    if (merchantMatch) {
      merchant = merchantMatch[1].trim();
    }

    return {
      amount: parseFloat(amount.replace(/,/g, '')),
      type: 'income',
      date: parseDate(date),
      merchant: merchant.substring(0, 50), // Limit length
      category: 'Income',
      source: 'SMS',
      accountInfo: extractAccountInfo(message)
    };
  }
  return null;
};

/**
 * Parse Credit Card Payment Credit SMS
 * Example: "HDFC Bank Cardmember, Online Payment of Rs.4567 vide Ref# 304104051VZ8b3c was credited to your card ending 8656 On 31/OCT/2025"
 */
const parseCreditCardPayment = (message) => {
  const regex = /(?:Online Payment|Payment).*?Rs\.?([\ d,]+\.?\ d*).*?credited to your card.*?(?:On|on)\ s+(\ d{2}\/[A-Z]{3}\/\ d{4})/is;
  const match = message.match(regex);

  if (match) {
    const [, amount, date] = match;
    return {
      amount: parseFloat(amount.replace(/,/g, '')),
      type: 'income',
      date: parseDate(date),
      merchant: 'Credit Card Payment',
      category: 'Credit Card',
      source: 'SMS',
      accountInfo: extractAccountInfo(message)
    };
  }
  return null;
};

/**
 * Parse UPI Credit SMS
 * Example: "Credit Alert! Rs.200.00 credited to HDFC Bank A/c XX1263 on 16-11-25 from VPA ashish.pesu@oksbi (UPI 532049625234)"
 */
const parseUPICredit = (message) => {
  const regex = /(?:Credit Alert!|Rs\.?)\ s*([\ d,]+\.?\ d*)\ s+credited.*?on\ s+(\ d{2}-\ d{2}-\ d{2}).*?(?:from VPA|VPA)\ s+([^\ s(]+)/is;
  const match = message.match(regex);

  if (match) {
    const [, amount, date, vpa] = match;
    return {
      amount: parseFloat(amount.replace(/,/g, '')),
      type: 'income',
      date: parseDate(date),
      merchant: `UPI from ${vpa}`,
      category: 'UPI Payment',
      source: 'SMS',
      accountInfo: extractAccountInfo(message)
    };
  }
  return null;
};

/**
 * Parse UPI Reversal SMS (Money returned)
 * Example: "HDFC Bank : Your UPI transaction of 500.00 has been reversed in your account due to technical problem (UPI Ref no. 567869966958)"
 */
const parseUPIReversal = (message) => {
  const regex = /UPI transaction of\ s+([\ d,]+\.?\ d*)\ s+has been reversed/is;
  const match = message.match(regex);

  if (match) {
    const [, amount] = match;
    return {
      amount: parseFloat(amount.replace(/,/g, '')),
      type: 'income',
      date: new Date().toISOString(), // No date in message, use current
      merchant: 'UPI Reversal',
      category: 'UPI Payment',
      source: 'SMS',
      accountInfo: extractAccountInfo(message)
    };
  }
  return null;
};

/**
 * Parse Payment Debit SMS
 * Example: "PAYMENT ALERT! INR 1500.00 deducted from HDFC Bank A/C No 1263 towards MIRAEASSETGLOBALINVESTMENT IND UMRN: HDFC0000000013819950"
 */
const parsePaymentDebit = (message) => {
  const regex = /(?:INR|Rs\.?)\ s*([\ d,]+\.?\ d*)\ s+deducted.*?towards\ s+(.*?)(?:UMRN|UMN|$)/is;
  const match = message.match(regex);

  if (match) {
    const [, amount, merchant] = match;
    return {
      amount: parseFloat(amount.replace(/,/g, '')),
      type: 'expense',
      date: new Date().toISOString(), // No date in message, use current
      merchant: merchant.trim(),
      category: 'Auto-debit',
      source: 'SMS',
      accountInfo: extractAccountInfo(message)
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
    parseUPICredit,
    parseUPIReversal,
    parseCreditCardSpent,
    parseCreditCardPayment,
    parseEMandate,
    parsePaymentDebit,
    parseNEFTCredit
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
