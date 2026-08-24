// Compares two strings using Dice's Coefficient: break each string into
// overlapping 2-character chunks ("bigrams"), then measure how many of those
// chunks the two strings have in common. Returns 0 (nothing alike) to 1
// (identical). Good for catching typos/variations in names without needing
// an exact match.
function toBigrams(str) {
  const bigrams = [];
  for (let i = 0; i < str.length - 1; i++) {
    bigrams.push(str.slice(i, i + 2));
  }
  return bigrams;
}

function compareTwoStrings(a, b) {
  const first = a.replace(/\s+/g, '').toLowerCase();
  const second = b.replace(/\s+/g, '').toLowerCase();

  if (first === second) return 1;
  if (first.length < 2 || second.length < 2) return 0;

  const firstBigrams = toBigrams(first);
  const secondBigrams = toBigrams(second);
  const remaining = [...secondBigrams];

  let matches = 0;
  for (const bigram of firstBigrams) {
    const index = remaining.indexOf(bigram);
    if (index !== -1) {
      remaining.splice(index, 1);
      matches++;
    }
  }

  return (2 * matches) / (firstBigrams.length + secondBigrams.length);
}

module.exports = { compareTwoStrings };
