import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const error = request.nextUrl.searchParams.get('error')
  const errorDescription = request.nextUrl.searchParams.get('error_description')

  if (error) {
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head><title>Authorization Error</title></head>
        <body style="font-family: system-ui; padding: 40px; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #dc2626;">Authorization Failed</h1>
          <p><strong>Error:</strong> ${error}</p>
          <p>${errorDescription || ''}</p>
          <a href="/settings" style="color: #2563eb;">Return to Settings</a>
        </body>
      </html>
      `,
      { headers: { 'Content-Type': 'text/html' } }
    )
  }

  if (!code) {
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head><title>No Code</title></head>
        <body style="font-family: system-ui; padding: 40px; max-width: 600px; margin: 0 auto;">
          <h1>No Authorization Code</h1>
          <p>No authorization code was received from Amazon.</p>
          <a href="/settings" style="color: #2563eb;">Return to Settings</a>
        </body>
      </html>
      `,
      { headers: { 'Content-Type': 'text/html' } }
    )
  }

  // Redirect to settings with the code as a query param
  // Use x-forwarded-host header for production behind reverse proxy
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:8080'
  const protocol = request.headers.get('x-forwarded-proto') || 'https'
  const baseUrl = `${protocol}://${host}`
  return NextResponse.redirect(new URL(`/settings?amazon_code=${code}`, baseUrl))
}
