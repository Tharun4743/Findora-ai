// FINDORA AI - Fraud Shield & Risk Analysis Engine

/**
 * Analyze Claimant Risk based on claim history, velocity, and pattern anomalies
 */
function analyzeClaimantRisk(claimantId, currentClaim, userClaimHistory = []) {
  let riskScore = 15; // Baseline low risk for standard verified account
  const riskFactors = [];

  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  // 1. Claim Velocity Check
  const claimsLast24h = userClaimHistory.filter(c => new Date(c.created_at).getTime() > oneDayAgo);
  const claimsLast7d = userClaimHistory.filter(c => new Date(c.created_at).getTime() > sevenDaysAgo);

  if (claimsLast24h.length >= 3) {
    riskScore += 35;
    riskFactors.push(`High claim velocity: ${claimsLast24h.length} claims submitted within the last 24 hours.`);
  } else if (claimsLast7d.length >= 5) {
    riskScore += 25;
    riskFactors.push(`Elevated weekly claim volume (${claimsLast7d.length} claims in 7 days).`);
  }

  // 2. Prior Rejection Rate Check
  const rejectedClaims = userClaimHistory.filter(c => c.status === 'REJECTED');
  if (rejectedClaims.length >= 2) {
    riskScore += 30;
    riskFactors.push(`Prior rejected claims detected (${rejectedClaims.length} prior claims rejected).`);
  }

  // 3. Contradictory or Low-Quality Answers Check
  if (currentClaim && currentClaim.verification_score !== undefined) {
    if (currentClaim.verification_score < 0.4) {
      riskScore += 25;
      riskFactors.push('Significant divergence between claimant description and true hidden characteristics.');
    } else if (currentClaim.verification_score > 0.85) {
      // Good faith reduction
      riskScore = Math.max(riskScore - 10, 5);
    }
  }

  // 4. Multiple high-value claims in different categories
  const electronicsClaims = userClaimHistory.filter(c => c.category === 'Electronics');
  if (electronicsClaims.length >= 3) {
    riskScore += 20;
    riskFactors.push('Unusual frequency of high-value electronic device claims.');
  }

  // Normalization
  riskScore = Math.min(Math.max(riskScore, 10), 95);

  let riskLevel = 'LOW';
  let recommendedAction = 'PROCEED_TO_HANDOVER';

  if (riskScore >= 65) {
    riskLevel = 'HIGH';
    recommendedAction = 'MANUAL_OFFICER_REVIEW';
  } else if (riskScore >= 35) {
    riskLevel = 'MEDIUM';
    recommendedAction = 'SECONDARY_VERIFICATION';
  }

  // If clean history, supply positive confidence factor
  if (riskFactors.length === 0) {
    riskFactors.push('Clean user history: Single active claim with consistent device characteristics.');
  }

  return {
    risk_score: riskScore,
    risk_level: riskLevel,
    risk_factors: riskFactors,
    recommended_action: recommendedAction
  };
}

module.exports = {
  analyzeClaimantRisk
};
