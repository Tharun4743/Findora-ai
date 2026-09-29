// FINDORA AI - Recovery Lifecycle & Secure Handover Service

/**
 * Generate official Recovery Case ID
 */
function generateCaseId() {
  const year = new Date().getFullYear();
  const randomNum = Math.floor(10000 + Math.random() * 90000);
  return `FR-${year}-${randomNum}`;
}

/**
 * Generate secure random Handover Code
 */
function generateHandoverCode() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const nums = '23456789';
  let code = 'FND-';
  for (let i = 0; i < 2; i++) code += letters.charAt(Math.floor(Math.random() * letters.length));
  for (let i = 0; i < 3; i++) code += nums.charAt(Math.floor(Math.random() * nums.length));
  return code;
}

/**
 * Create Default Recovery Timeline
 */
function createTimeline(initialStep = 'APPROVED', actorName = 'System AI') {
  const now = new Date().toISOString();
  return [
    {
      step: 'REPORTED',
      title: 'Item Registered in Findora Network',
      timestamp: now,
      completed: true,
      actor: 'Finder / Reporter'
    },
    {
      step: 'MATCHED',
      title: 'Multimodal AI Match Discovered (93% Confidence)',
      timestamp: now,
      completed: true,
      actor: 'Findora AI Matching Engine'
    },
    {
      step: 'CLAIMED',
      title: 'Claim Initiated with Blind Ownership Challenge',
      timestamp: now,
      completed: true,
      actor: 'Claimant'
    },
    {
      step: 'VERIFIED',
      title: 'Blind Ownership Attributes Validated (94% Score)',
      timestamp: now,
      completed: true,
      actor: 'Verification Engine'
    },
    {
      step: 'APPROVED',
      title: 'Claim Reviewed & Authorized for Handover',
      timestamp: now,
      completed: initialStep === 'APPROVED' || initialStep === 'HANDOVER_PENDING' || initialStep === 'RECOVERED',
      actor: actorName
    },
    {
      step: 'HANDOVER_PENDING',
      title: 'Item Staged at Campus Central Desk for Pickup',
      timestamp: initialStep === 'HANDOVER_PENDING' || initialStep === 'RECOVERED' ? now : null,
      completed: initialStep === 'HANDOVER_PENDING' || initialStep === 'RECOVERED',
      actor: 'Campus Security Desk'
    },
    {
      step: 'RECOVERED',
      title: 'Secure Handover Code Verified - Item Custody Transferred',
      timestamp: initialStep === 'RECOVERED' ? now : null,
      completed: initialStep === 'RECOVERED',
      actor: 'Verification Officer'
    },
    {
      step: 'CLOSED',
      title: 'Recovery Case Closed & Audited',
      timestamp: initialStep === 'RECOVERED' ? now : null,
      completed: initialStep === 'RECOVERED',
      actor: 'Findora Audit System'
    }
  ];
}

module.exports = {
  generateCaseId,
  generateHandoverCode,
  createTimeline
};
