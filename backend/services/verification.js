// FINDORA AI - Blind-Match Ownership Protocol & Verification Engine

/**
 * Generate Blind Challenge Questions from Private Attributes
 * Crucial rule: Never leak the private attribute answer in the question prompt!
 */
function generateBlindQuestions(privateAttributes) {
  const questions = [];

  if (!privateAttributes) {
    return [
      {
        question_key: 'unique_marks',
        prompt: 'Describe any stickers, tags, decals, or distinguishing markings on the item.'
      },
      {
        question_key: 'damage_details',
        prompt: 'Describe any specific scratches, cracks, dents, or signs of wear.'
      }
    ];
  }

  if (privateAttributes.unique_marks) {
    questions.push({
      question_key: 'unique_marks',
      prompt: 'What specific sticker, decal, keychain, or engraved marking is attached to the item or base?'
    });
  }

  if (privateAttributes.damage_details) {
    questions.push({
      question_key: 'damage_details',
      prompt: 'Describe any unique scratches, cosmetic marks, or damaged keys/buttons on the item.'
    });
  }

  if (privateAttributes.hidden_features || privateAttributes.serial_number) {
    questions.push({
      question_key: 'hidden_features',
      prompt: 'What unique internal contents, custom settings, or serial numbers confirm your ownership?'
    });
  }

  // Ensure at least 2 questions are provided
  if (questions.length < 2) {
    questions.push({
      question_key: 'damage_details',
      prompt: 'Describe any specific physical defect, corner scratch, or unique feature.'
    });
  }

  return questions;
}

/**
 * Tokenize and normalize text for semantic overlap
 */
function extractSignificantKeywords(str) {
  if (!str) return [];
  const stopWords = new Set(['the', 'a', 'an', 'on', 'in', 'near', 'under', 'at', 'with', 'and', 'or', 'is', 'it', 'my', 'small', 'one']);
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
}

/**
 * Simple Levenshtein distance for fuzzy typo tolerance
 */
function levenshteinDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function fuzzyIncludes(sourceTokens, targetWord) {
  for (const token of sourceTokens) {
    if (token === targetWord) return true;
    if (Math.abs(token.length - targetWord.length) <= 2) {
      if (levenshteinDistance(token, targetWord) <= 1) return true;
    }
  }
  return false;
}

/**
 * Verify claimant's answers against true private attributes
 */
function verifyOwnershipAnswers(answers, privateAttributes) {
  // answers: [{ question_key: 'unique_marks', claimant_answer: 'Red sticker underneath' }, ...]
  if (!privateAttributes) {
    return {
      ownership_confidence: 0.5,
      is_verified: false,
      requires_manual_review: true,
      details: { summary: 'No private attributes recorded on found item.' }
    };
  }

  let totalWeight = 0;
  let accumulatedScore = 0;
  const matchDetails = {};

  answers.forEach(item => {
    const key = item.question_key;
    const answer = (item.claimant_answer || '').trim();
    const trueAttr = (privateAttributes[key] || '').trim();

    if (!trueAttr) return;

    totalWeight += 1;
    const answerTokens = extractSignificantKeywords(answer);
    const trueTokens = extractSignificantKeywords(trueAttr);

    if (trueTokens.length === 0) return;

    let matchedCount = 0;
    trueTokens.forEach(token => {
      if (fuzzyIncludes(answerTokens, token)) {
        matchedCount++;
      }
    });

    const ratio = trueTokens.length > 0 ? (matchedCount / trueTokens.length) : 0;
    const allTokens = new Set([...answerTokens, ...trueTokens]);
    const jaccard = allTokens.size > 0 ? (matchedCount / allTokens.size) : 0;
    
    // Algorithmic score combining recall ratio and Jaccard token similarity
    let questionScore = Math.min(Math.max((ratio * 0.65) + (jaccard * 0.35), 0), 1.0);

    accumulatedScore += questionScore;
    matchDetails[key] = {
      score: Math.round(questionScore * 100),
      matched: questionScore >= 0.60,
      answer_analyzed: answer
    };
  });

  const rawScore = totalWeight > 0 ? (accumulatedScore / totalWeight) : 0;
  const ownership_confidence = Math.min(Math.max(Math.round(rawScore * 100) / 100, 0), 1.0);

  const is_verified = ownership_confidence >= 0.75;
  const requires_manual_review = ownership_confidence >= 0.40 && ownership_confidence < 0.75;

  return {
    ownership_confidence,
    is_verified,
    requires_manual_review,
    damage_match: matchDetails['damage_details']?.matched || false,
    sticker_match: matchDetails['unique_marks']?.matched || false,
    unique_attr_match: matchDetails['hidden_features']?.matched || false,
    breakdown: matchDetails
  };
}

module.exports = {
  generateBlindQuestions,
  verifyOwnershipAnswers
};
