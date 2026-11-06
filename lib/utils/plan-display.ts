/**
 * Public pricing cards must not advertise the activation fee. Admins sometimes
 * type notes like "+$45 activation fee (paid separately)" into a plan's
 * benefits or description; these helpers strip them before display. The fee is
 * still charged and shown at the activation step, just not on the pricing card.
 */

// Optional "+", optional currency + amount (e.g. "$45", "₦45,000", "GH₵ 45"),
// "activation fee", optional parenthetical (e.g. "(paid separately)").
const ACTIVATION_FEE_NOTE =
  /\+?\s*(?:[^\s\d]{0,3}\s*\d[\d,.]*\s*)?activation\s+fees?\b(?:\s*\([^)]*\))?/gi

function stripActivationFeeNote(text: string): string {
  return text
    .replace(ACTIVATION_FEE_NOTE, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .replace(/^[\s.,;:\-–—+]+|[\s,;:\-–—+]+$/g, '')
}

// Each benefit is its own bullet, so any bullet mentioning the fee is dropped whole.
export function getPublicPlanBenefits(benefits: string[] | null | undefined): string[] {
  return (benefits ?? []).filter((b) => !/activation\s+fees?\b/i.test(b))
}

export function getPublicPlanDescription(description: string | null | undefined): string {
  return description ? stripActivationFeeNote(description) : ''
}
