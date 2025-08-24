import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Get the authorization token from cookies
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const params = await context.params
    const fileId = params.id
    if (!fileId) {
      return NextResponse.json(
        { success: false, message: 'File ID is required' },
        { status: 400 }
      )
    }

    // Forward the request to the backend
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
    const fileUrl = `${backendUrl}/api/files/${fileId}`

    const response = await fetch(fileUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    const responseData = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message: responseData.message || 'Failed to get file',
          error: responseData.error
        },
        { status: response.status }
      )
    }

    return NextResponse.json(responseData)
  } catch (error) {
    console.error('File retrieval error:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error during file retrieval'
      },
      { status: 500 }
    )
  }
}