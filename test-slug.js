// Test slug generation
const generateSlug = (name) => {
  return name
    .toLowerCase()
    .normalize('NFD') // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-'); // Replace multiple hyphens with single hyphen
};

// Test with various city names
const testCities = [
  'Napoli',
  'Roma',
  'Città di Castello',
  'L\'Aquila',
  'Reggio Calabria',
  'Modena',
  'São Paulo', // edge case with special chars
  'Bologna',
  'Alghero'
];

console.log('Testing slug generation:\n');
testCities.forEach(city => {
  const slug = generateSlug(city);
  const url = `/citta/${slug}`;
  console.log(`${city.padEnd(20)} -> ${url}`);
});
