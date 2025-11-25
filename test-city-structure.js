// Test to see the exact structure of ended cities
import { getCityById } from './src/data/cities.js';

const genova = getCityById('genova');
console.log('Genova city object:');
console.log(JSON.stringify(genova, null, 2));

console.log('\nGenova.name type:', typeof genova.name);
console.log('Genova.name value:', genova.name);

console.log('\nGenova.status type:', typeof genova.status);
console.log('Genova.status value:', genova.status);

console.log('\nGenova.eventData:', genova.eventData);
