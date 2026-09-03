import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthFromRequest } from '@open-mercato/shared/lib/auth/server'
import { createLogger } from '@open-mercato/shared/lib/logger'
import type { OpenApiRouteDoc } from '@open-mercato/shared/lib/openapi'
import {
  CursorCloudPermanentError,
  CursorCloudTransientError,
  listCursorModels,
  resolveCursorCloudConfig,
} from '../../lib/cursorCloud'
import { isMockResearchMode } from '../../lib/researchMode'

const logger = createLogger('research').child({ component: 'models-route' })

const modelItemSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  description: z.string().nullable(),
})

const modelsResponseSchema = z.object({
  live: z.boolean(),
  configured: z.boolean(),
  items: z.array(modelItemSchema),
})

const modelsErrorSchema = z.object({
  error: z.string(),
})

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['research.run'] },
}

export async function GET(req: Request) {
  try {
    const auth = await getAuthFromRequest(req)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const live = !isMockResearchMode()
    const config = resolveCursorCloudConfig()
    if (!live || !config) {
      return NextResponse.json({
        live,
        configured: Boolean(config),
        items: [],
      })
    }

    const items = await listCursorModels(config)
    return NextResponse.json({
      live,
      configured: true,
      items,
    })
  } catch (error) {
    if (error instanceof CursorCloudTransientError || error instanceof CursorCloudPermanentError) {
      logger.warn('Failed to list Cursor models', { err: error })
      return NextResponse.json({ error: error.message }, { status: 502 })
    }
    logger.error('Failed to list research models', { err: error })
    return NextResponse.json({ error: 'Failed to list research models' }, { status: 500 })
  }
}

export const openApi: OpenApiRouteDoc = {
  summary: 'List Cursor models for a research run',
  methods: {
    GET: {
      summary: 'List Cursor Cloud models',
      description: 'Returns the models a user can pick when starting a live research run.',
      tags: ['Research'],
      responses: [
        { status: 200, description: 'Available models', schema: modelsResponseSchema },
      ],
      errors: [
        { status: 401, description: 'Unauthorized', schema: modelsErrorSchema },
        { status: 502, description: 'Cursor Cloud rejected the models request', schema: modelsErrorSchema },
        { status: 500, description: 'Failed to list models', schema: modelsErrorSchema },
      ],
    },
  },
}
