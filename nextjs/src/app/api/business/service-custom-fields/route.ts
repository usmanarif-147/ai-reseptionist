import { NextRequest, NextResponse } from 'next/server'
import { authenticateAndGetBusiness } from '@/lib/auth'

const VALID_INPUT_TYPES = ['text', 'number', 'dropdown', 'checkbox']

function toFieldKey(label: string): string {
  return label.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

export async function GET() {
  const auth = await authenticateAndGetBusiness()
  if (auth.error) return auth.error
  const { business, supabase } = auth

  if (!business) {
    return NextResponse.json({ error: 'No business found' }, { status: 404 })
  }

  const { data: fields, error } = await supabase
    .from('service_custom_fields')
    .select('*')
    .eq('business_id', business.id)
    .order('sort_order', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(fields)
}

export async function POST(request: NextRequest) {
  const auth = await authenticateAndGetBusiness()
  if (auth.error) return auth.error
  const { business, supabase } = auth

  if (!business) {
    return NextResponse.json({ error: 'No business found' }, { status: 404 })
  }

  const body = await request.json()
  const { label, input_type, is_required, sort_order, options } = body

  if (!label || typeof label !== 'string' || label.trim().length === 0) {
    return NextResponse.json({ error: 'Label is required' }, { status: 400 })
  }

  if (!input_type || !VALID_INPUT_TYPES.includes(input_type)) {
    return NextResponse.json(
      { error: `input_type must be one of: ${VALID_INPUT_TYPES.join(', ')}` },
      { status: 400 }
    )
  }

  if (input_type === 'dropdown') {
    if (!Array.isArray(options) || options.length === 0) {
      return NextResponse.json(
        { error: 'Options must be a non-empty array for dropdown fields' },
        { status: 400 }
      )
    }
  }

  const field_key = toFieldKey(label)

  const { data: field, error } = await supabase
    .from('service_custom_fields')
    .insert({
      business_id: business.id,
      label: label.trim(),
      field_key,
      input_type,
      is_required: is_required ?? false,
      sort_order: sort_order ?? 0,
      options: input_type === 'dropdown' ? options : [],
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(field, { status: 201 })
}

export async function PUT(request: NextRequest) {
  const auth = await authenticateAndGetBusiness()
  if (auth.error) return auth.error
  const { business, supabase } = auth

  if (!business) {
    return NextResponse.json({ error: 'No business found' }, { status: 404 })
  }

  const body = await request.json()
  const { id, label, input_type, is_required, sort_order, options } = body

  if (!id) {
    return NextResponse.json({ error: 'Field id is required' }, { status: 400 })
  }

  if (label !== undefined && (typeof label !== 'string' || label.trim().length === 0)) {
    return NextResponse.json({ error: 'Label cannot be empty' }, { status: 400 })
  }

  if (input_type !== undefined && !VALID_INPUT_TYPES.includes(input_type)) {
    return NextResponse.json(
      { error: `input_type must be one of: ${VALID_INPUT_TYPES.join(', ')}` },
      { status: 400 }
    )
  }

  const effectiveInputType = input_type
  if (effectiveInputType === 'dropdown') {
    if (options !== undefined && (!Array.isArray(options) || options.length === 0)) {
      return NextResponse.json(
        { error: 'Options must be a non-empty array for dropdown fields' },
        { status: 400 }
      )
    }
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (label !== undefined) {
    updates.label = label.trim()
    updates.field_key = toFieldKey(label)
  }
  if (input_type !== undefined) updates.input_type = input_type
  if (is_required !== undefined) updates.is_required = is_required
  if (sort_order !== undefined) updates.sort_order = sort_order
  if (options !== undefined) updates.options = options

  const { data: field, error } = await supabase
    .from('service_custom_fields')
    .update(updates)
    .eq('id', id)
    .eq('business_id', business.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(field)
}

export async function DELETE(request: NextRequest) {
  const auth = await authenticateAndGetBusiness()
  if (auth.error) return auth.error
  const { business, supabase } = auth

  if (!business) {
    return NextResponse.json({ error: 'No business found' }, { status: 404 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Field id is required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('service_custom_fields')
    .delete()
    .eq('id', id)
    .eq('business_id', business.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
