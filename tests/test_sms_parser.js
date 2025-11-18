/**
 * Test script for SMS Parser
 * Tests the parser with actual SMS data from template.txt
 */

const fs = require('fs');
const path = require('path');

// CommonJS version of the parser for testing
const parseDate = (dateStr) => {
  const ddmmyyMatch = dateStr.match(/(\d{2})\/(\d{2})\/(\d{2})/);
  if (ddmmyyMatch) {
    const [, day, month, year] = ddmmyyMatch;
    const fullYear = `20${year}`;
    return new Date(`${fullYear}-${month}-${day}`).toISOString();
  }

  const ddmmmyyyyMatch = dateStr.match(/(\d{2})\s+([A-Z]{3})\s+(\d{4})/);
  if (ddmmmyyyyMatch) {
    const [, day, month, year] = ddmmmyyyyMatch;
    const monthMap = {
      JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
      JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12'
    };
    return new Date(`${year}-${monthMap[month]}-${day}`).toISOString();
  }

  return new Date().toISOString();
};

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

const parseSMS = (messageBody) => {
  if (!messageBody || typeof messageBody !== 'string') {
    return null;
  }

  const parsers = [parseUPISent, parseCreditCardSpent, parseEMandate];

  for (const parser of parsers) {
    const result = parser(messageBody);
    if (result) {
      return result;
    }
  }

  return null;
};

// Read template.txt
const templatePath = path.join(__dirname, '..', 'template.txt');
const templateContent = fs.readFileSync(templatePath, 'utf-8');

// Split by double newlines to get individual SMS messages
const smsMessages = templateContent.split('\n\n').filter(msg => msg.trim().length > 0);

console.log('='.repeat(60));
console.log('SMS Parser Test Results');
console.log('='.repeat(60));
console.log(`Total SMS messages: ${smsMessages.length}\n`);

let successCount = 0;
let failCount = 0;

smsMessages.forEach((sms, index) => {
  console.log(`\n--- Message ${index + 1} ---`);
  console.log(`SMS: ${sms.substring(0, 80).replace(/\n/g, ' ')}...`);
  
  const result = parseSMS(sms);
  
  if (result) {
    successCount++;
    console.log('✓ PARSED SUCCESSFULLY');
    console.log(`  Amount: ₹${result.amount}`);
    console.log(`  Merchant: ${result.merchant}`);
    console.log(`  Category: ${result.category}`);
    console.log(`  Date: ${result.date.split('T')[0]}`);
    console.log(`  Type: ${result.type}`);
  } else {
    failCount++;
    console.log('✗ FAILED TO PARSE');
  }
});

console.log('\n' + '='.repeat(60));
console.log('Summary');
console.log('='.repeat(60));
console.log(`Successfully parsed: ${successCount}/${smsMessages.length}`);
console.log(`Failed to parse: ${failCount}/${smsMessages.length}`);
console.log(`Success rate: ${((successCount / smsMessages.length) * 100).toFixed(1)}%`);
console.log('='.repeat(60));
