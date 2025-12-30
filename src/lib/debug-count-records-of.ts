import data from './dataset.json'; // Load the array from data.js

const items = data.filter((item) => item.vulgarity === 2);
console.log(items);

console.log('length', items.length); // Count items with value > 2
