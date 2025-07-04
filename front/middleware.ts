import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const publicRoutes = [
  '/login',
  '/register'  // Agregar esta línea
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  const isProtectedRoute = !publicRoutes.includes(pathname)
  const isPublicRoute = publicRoutes.includes(pathname)
  
  const isAuthenticated = request.cookies.get('auth-token')?.value || false
  
  console.log('Middleware:', { pathname, isAuthenticated, isProtectedRoute, isPublicRoute })
  
  if (isProtectedRoute && !isAuthenticated) {
    console.log('Redirecting to login from middleware')
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  if (isPublicRoute && isAuthenticated && pathname === '/login') {
    console.log('Redirecting to home from middleware')
    return NextResponse.redirect(new URL('/', request.url))
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}