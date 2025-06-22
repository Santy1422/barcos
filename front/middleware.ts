import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const publicRoutes = ['/login']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Agregar el pathname a los headers para que esté disponible en el layout
  const response = NextResponse.next()
  response.headers.set('x-pathname', pathname)
  
  const isProtectedRoute = !publicRoutes.includes(pathname)
  const isPublicRoute = publicRoutes.includes(pathname)
  
  const isAuthenticated = request.cookies.get('auth-token')?.value || false
  
  if (isProtectedRoute && !isAuthenticated) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  if (isPublicRoute && isAuthenticated && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url))
  }
  
  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}