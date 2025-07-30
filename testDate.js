const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const dayAfter = new Date();
dayAfter.setDate(dayAfter.getDate() + 3);

console.log('Tomorrow:', tomorrow.toISOString());
console.log('Day after:', dayAfter.toISOString());
console.log('Tomorrow date only:', tomorrow.toISOString().split('T')[0]);
console.log('Day after date only:', dayAfter.toISOString().split('T')[0]);

// Test the validation logic
const checkInDate = tomorrow.toISOString().split('T')[0];
const checkIn = new Date(checkInDate);
console.log('Check-in parsed:', checkIn);
console.log('Is check-in < now?', checkIn < new Date());
console.log('Current time:', new Date());