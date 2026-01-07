import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { getTriageRules } from '@/lib/triage-rules'

/**
 * GET /api/admin/triage-rules
 * Retrieve current triage rules configuration
 *
 * Requires: Admin role
 * Returns: { complaintKeywords, urgencyKeywords, priorityKeywords, complaintTypeKeywords }
 */
export async function GET(req: NextRequest) {
  try {
    // Authenticate user (Admin only)
    const session = await requireAdmin(req)
    if (session instanceof NextResponse) {
      return session
    }

    // Get triage rules
    const rules = getTriageRules()

    console.log('Triage rules retrieved:', {
      userId: session.user.id,
      complaintKeywordsCount: rules.complaintKeywords.length,
      priorityKeywordsCount: rules.priorityKeywords.length,
    })

    return NextResponse.json(
      {
        success: true,
        rules,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error retrieving triage rules:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
