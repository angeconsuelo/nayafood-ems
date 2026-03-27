const models = require('./src/models');
console.log('Models loaded:', Object.keys(models));
console.log('Shift model:', models.Shift ? '✓ Found' : '✗ Missing');
console.log('ShiftRotation model:', models.ShiftRotation ? '✓ Found' : '✗ Missing');
console.log('WorkSchedule model:', models.WorkSchedule ? '✓ Found' : '✗ Missing');