// FINDORA AI - Grounded AI Search Assistant

const CATEGORY_KEYWORDS = {
  'Electronics': ['laptop', 'macbook', 'dell', 'hp', 'phone', 'iphone', 'airpods', 'headphones', 'charger', 'watch', 'tablet', 'ipad', 'calculator'],
  'Bags': ['backpack', 'bag', 'tote', 'duffel', 'purse', 'wallet', 'rucksack'],
  'Keys': ['key', 'keys', 'keychain', 'fob'],
  'Documents': ['id', 'card', 'passport', 'license', 'notebook', 'binder', 'textbook'],
  'Clothing': ['jacket', 'hoodie', 'sweater', 'coat', 'scarf', 'hat', 'cap', 'umbrella'],
  'Accessories': ['glasses', 'sunglasses', 'ring', 'necklace', 'bracelet', 'bottle', 'flask', 'hydroflask']
};

const COLOR_KEYWORDS = [
  'black', 'blue', 'red', 'white', 'grey', 'gray', 'silver', 'gold', 'green', 'yellow', 'brown', 'purple', 'orange', 'navy'
];

const LOCATION_KEYWORDS = {
  'Library': ['library', 'reading room', 'stacks', 'librarian'],
  'Science Complex': ['science', 'lab', 'biology', 'chemistry', 'physics'],
  'Student Union': ['union', 'student center', 'lounge', 'atrium'],
  'Gymnasium': ['gym', 'athletic', 'court', 'locker', 'pool'],
  'Dining Hall': ['dining', 'cafeteria', 'food court', 'commons', 'canteen'],
  'Engineering Center': ['engineering', 'maker space', 'quad', 'robotics'],
  'Hostel Block A': ['hostel', 'dorm', 'residence', 'hall a']
};

function parseNaturalLanguageQuery(queryText) {
  if (!queryText) return {};

  const cleanQuery = queryText.toLowerCase();
  const extracted = {
    category: null,
    color: null,
    building: null,
    keywords: []
  };

  // Extract category
  for (const [category, words] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const w of words) {
      if (cleanQuery.includes(w)) {
        extracted.category = category;
        extracted.keywords.push(w);
        break;
      }
    }
    if (extracted.category) break;
  }

  // Extract color
  for (const color of COLOR_KEYWORDS) {
    if (cleanQuery.includes(color)) {
      extracted.color = color;
      break;
    }
  }

  // Extract building / location
  for (const [building, words] of Object.entries(LOCATION_KEYWORDS)) {
    for (const w of words) {
      if (cleanQuery.includes(w)) {
        extracted.building = building;
        break;
      }
    }
    if (extracted.building) break;
  }

  return extracted;
}

module.exports = {
  parseNaturalLanguageQuery
};
