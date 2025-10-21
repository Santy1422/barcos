import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'

export type UserRole = 'administrador' | 'operaciones' | 'facturacion' | 'pendiente'
export type UserModule = 'trucking' | 'shipchandler' | 'agency'

export interface User {
  id: string
  email: string
  name: string
  username?: string
  fullName?: string
  role?: UserRole // Mantener para compatibilidad con registros antiguos
  roles?: UserRole[] // Nuevo campo para múltiples roles
  modules?: UserModule[]
  isActive?: boolean
  lastLogin?: string
  createdAt: string
}

interface AuthState {
  isAuthenticated: boolean
  currentUser: User | null
  users: User[]
  loading: boolean
  authLoading: boolean // Loading específico para login/register/verifyToken
  error: string | null
  token: string | null
}

const initialState: AuthState = {
  isAuthenticated: false,
  currentUser: null,
  users: [
    {
      id: '1',
      email: 'admin@barcos.com',
      name: 'Administrador',
      role: 'administrador',
      createdAt: new Date().toISOString(),
    },
  ],
  loading: false,
  authLoading: false,
  error: null,
  token: null,
}

// Función para cargar estado inicial desde localStorage
const loadInitialState = (): AuthState => {
  if (typeof window === 'undefined') return initialState
  
  try {
    const token = localStorage.getItem('token')
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true'
    const currentUser = localStorage.getItem('currentUser')
    
    console.log('Loading initial state from localStorage:', { token: !!token, isAuthenticated, currentUser: !!currentUser })
    
      if (token && isAuthenticated && currentUser) {
      const parsedUser = JSON.parse(currentUser)
      console.log('Restoring authenticated state:', { user: parsedUser })
      return {
        ...initialState,
        isAuthenticated: true,
        authLoading: false,
        token,
        currentUser: parsedUser
      }
    }
  } catch (error) {
    console.error('Error loading auth state from localStorage:', error)
  }
  
  return initialState
}

// Usar el estado inicial cargado
const authInitialState = loadInitialState()

// Async thunk para login con backend
export const loginAsync = createAsyncThunk(
  'auth/loginAsync',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/user/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }), // Cambiar de token2 a password
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.payload?.error || 'Error en el login')
      }
      
      const data = await response.json()
      
      // Los datos están envueltos en payload
      const { user, token } = data.payload
      
      if (!token) {
        throw new Error('Token no recibido del servidor')
      }
      
      // Guardar token en localStorage
      localStorage.setItem('token', token)
      
      // Guardar cookie para middleware
      document.cookie = `auth-token=true; path=/; max-age=86400`
      
      return {
        user: user,
        token: token
      }
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

// Async thunk para logout
export const logoutAsync = createAsyncThunk(
  'auth/logoutAsync',
  async (_, { dispatch }) => {
    // Limpiar localStorage
    localStorage.removeItem('token')
    localStorage.removeItem('isAuthenticated')
    
    // Limpiar cookie
    document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT'
    
    return null
  }
)

// Async thunk para verificar token al cargar la app
export const verifyToken = createAsyncThunk(
  'auth/verifyToken',
  async (_, { rejectWithValue }) => { 
    try {
      console.log('🔍 verifyToken - Starting...')
      const token = localStorage.getItem('token')
      if (!token) {
        console.log('❌ verifyToken - No token found')
        throw new Error('No token found')
      }
      
      console.log('🔍 verifyToken - Token found, calling /api/user/reloadUser...')
      const response = await fetch('/api/user/reloadUser', { 
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      
      console.log('🔍 verifyToken - Response status:', response.status)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('❌ verifyToken - Response not OK:', errorData)
        throw new Error(errorData.payload?.error || 'Token inválido')
      }
      
      const data = await response.json()
      console.log('✅ verifyToken - Response data:', data)
      
      // Los datos están envueltos en payload
      const { user } = data.payload
      
      if (!user) {
        console.error('❌ verifyToken - No user in response')
        throw new Error('Usuario no encontrado en la respuesta')
      }
      
      console.log('✅ verifyToken - User loaded:', { 
        id: user.id, 
        email: user.email, 
        role: user.role,
        modules: user.modules
      })
      
      return {
        user: user,
        token: token
      }
    } catch (error: any) {
      console.error('❌ verifyToken - Error:', error.message)
      // Limpiar datos inválidos
      localStorage.removeItem('token')
      localStorage.removeItem('isAuthenticated')
      localStorage.removeItem('currentUser')
      document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT'
      return rejectWithValue(error.message)
    }
  }
)

// Async thunk para registro con backend
export const registerAsync = createAsyncThunk(
  'auth/registerAsync',
  async ({ 
    username, 
    fullName, 
    name, 
    lastName, 
    email, 
    password, 
    role = 'pendiente',
    modules = []
  }: { 
    username: string;
    fullName: string;
    name: string;
    lastName: string;
    email: string;
    password: string;
    role?: UserRole;
    modules?: string[];
  }, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/user/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          username, 
          fullName, 
          name, 
          lastName, 
          email, 
          password, 
          role, 
          modules 
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.payload?.error || 'Error en el registro')
      }
      
      const data = await response.json()
      
      // Los datos están envueltos en payload
      const { user, token } = data.payload
      
      // Los usuarios pendientes no reciben token
      // Solo se crea el usuario, pero no se autentica
      if (!token) {
        // Usuario creado pero pendiente - no autenticar
        return {
          user: null,
          token: null,
          message: user.message || 'Cuenta creada. Espera activación del administrador.'
        }
      }
      
      // Si hay token (para compatibilidad futura)
      localStorage.setItem('token', token)
      document.cookie = `auth-token=true; path=/; max-age=86400`
      
      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username,
          fullName: user.fullName,
          role: user.role,
          modules: user.modules,
          isActive: user.isActive,
          createdAt: user.createdAt || new Date().toISOString()
        },
        token: token
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Error de conexión')
    }
  }
)

// Async thunk para obtener todos los usuarios (admin)
export const fetchAllUsersAsync = createAsyncThunk(
  'auth/fetchAllUsers',
  async (_, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: AuthState }
      const token = state.auth.token
      
      if (!token) {
        throw new Error('No autorizado')
      }
      
      const response = await fetch('/api/user/all', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.payload?.error || 'Error al obtener usuarios')
      }
      
      const data = await response.json()
      return data.payload.users
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

// Async thunk para actualizar usuario (admin)
export const updateUserAsync = createAsyncThunk(
  'auth/updateUser',
  async ({ id, updates }: { id: string; updates: Partial<User> }, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: AuthState }
      const token = state.auth.token
      
      if (!token) {
        throw new Error('No autorizado')
      }
      
      const response = await fetch(`/api/user/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.payload?.error || 'Error al actualizar usuario')
      }
      
      const data = await response.json()
      return data.payload.user
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

// Async thunk para eliminar usuario (admin)
export const deleteUserAsync = createAsyncThunk(
  'auth/deleteUser',
  async (userId: string, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: AuthState }
      const token = state.auth.token
      
      if (!token) {
        throw new Error('No autorizado')
      }
      
      const response = await fetch(`/api/user/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.payload?.error || 'Error al eliminar usuario')
      }
      
      return userId
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

// Async thunk para crear usuario como administrador (sin afectar sesión actual)
export const createUserAsync = createAsyncThunk(
  'auth/createUser',
  async ({ 
    username, 
    fullName, 
    email, 
    password, 
    roles = [],
    modules = [],
    isActive = true
  }: { 
    username: string;
    fullName: string;
    email: string;
    password: string;
    roles?: UserRole[];
    modules?: UserModule[];
    isActive?: boolean;
  }, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: AuthState }
      const token = state.auth.token
      
      if (!token) {
        throw new Error('No autorizado')
      }
      
      // Separar fullName en name y lastName
      const nameParts = fullName.trim().split(' ')
      const name = nameParts[0] || fullName
      const lastName = nameParts.slice(1).join(' ') || ''
      
      const response = await fetch('/api/user/register', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          username, 
          fullName, 
          name, 
          lastName, 
          email, 
          password, 
          roles, 
          modules,
          isActive
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.payload?.error || 'Error al crear usuario')
      }
      
      const data = await response.json()
      
      // Retornar solo el usuario creado, NO el token
      return data.payload.user
    } catch (error: any) {
      return rejectWithValue(error.message || 'Error de conexión')
    }
  }
)

const authSlice = createSlice({
  name: 'auth',
  initialState: authInitialState,
  reducers: {
    login: (state, action: PayloadAction<{ user: User; token: string }>) => {
      state.isAuthenticated = true
      state.currentUser = action.payload.user
      state.token = action.payload.token
      state.error = null
    },
    logout: (state) => {
      state.isAuthenticated = false
      state.currentUser = null
      state.token = null
      state.error = null
    },
    clearError: (state) => {
      state.error = null
    },
    addUser: (state, action: PayloadAction<User>) => {
      state.users.push(action.payload)
    },
    updateUser: (state, action: PayloadAction<User>) => {
      const index = state.users.findIndex(user => user.id === action.payload.id)
      if (index !== -1) {
        state.users[index] = action.payload
      }
    },
    deleteUser: (state, action: PayloadAction<string>) => {
      state.users = state.users.filter(user => user.id !== action.payload)
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      // Register async
      .addCase(registerAsync.pending, (state) => {
        state.loading = true
        state.authLoading = true
        state.error = null
      })
      .addCase(registerAsync.fulfilled, (state, action) => {
        state.loading = false
        state.authLoading = false
        
        // Si no hay token, el usuario está pendiente - NO autenticar
        if (!action.payload.token || !action.payload.user) {
          state.isAuthenticated = false
          state.currentUser = null
          state.token = null
        } else {
          // Usuario con token (compatibilidad futura)
          state.isAuthenticated = true
          state.currentUser = action.payload.user
          state.token = action.payload.token
          
          // Guardar estado en localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem('isAuthenticated', 'true')
            localStorage.setItem('currentUser', JSON.stringify(action.payload.user))
          }
        }
        
        state.error = null
      })
      .addCase(registerAsync.rejected, (state, action) => {
        state.loading = false
        state.authLoading = false
        state.error = action.payload as string
      })
      // Login async
      .addCase(loginAsync.pending, (state) => {
        console.log('LoginAsync pending')
        state.loading = true
        state.authLoading = true
        state.error = null
      })
      .addCase(loginAsync.fulfilled, (state, action) => {
        console.log('LoginAsync fulfilled - updating state:', action.payload)
        state.loading = false
        state.authLoading = false
        state.isAuthenticated = true
        state.currentUser = action.payload.user
        state.token = action.payload.token
        state.error = null
        
        // Guardar estado en localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('isAuthenticated', 'true')
          localStorage.setItem('currentUser', JSON.stringify(action.payload.user))
          console.log('Saved to localStorage:', { isAuthenticated: true, user: action.payload.user })
        }
      })
      .addCase(loginAsync.rejected, (state, action) => {
        console.log('LoginAsync rejected:', action.payload)
        state.loading = false
        state.authLoading = false
        state.isAuthenticated = false
        state.currentUser = null
        state.token = null
        state.error = action.payload as string
        
        // Limpiar localStorage en caso de error
        if (typeof window !== 'undefined') {
          localStorage.removeItem('isAuthenticated')
          localStorage.removeItem('currentUser')
        }
      })
      // Logout async
      .addCase(logoutAsync.fulfilled, (state) => {
        state.loading = false
        state.authLoading = false
        state.isAuthenticated = false
        state.currentUser = null
        state.token = null
        state.error = null
        
        // Limpiar localStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('isAuthenticated')
          localStorage.removeItem('currentUser')
        }
      })
      // Verify token
      .addCase(verifyToken.pending, (state) => {
        state.loading = true
        state.authLoading = true
      })
      .addCase(verifyToken.fulfilled, (state, action) => {
        state.loading = false
        state.authLoading = false
        state.isAuthenticated = true
        state.currentUser = action.payload.user
        state.token = action.payload.token
        
        // Guardar estado en localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('isAuthenticated', 'true')
          localStorage.setItem('currentUser', JSON.stringify(action.payload.user))
        }
      })
      .addCase(verifyToken.rejected, (state) => {
        state.loading = false
        state.authLoading = false
        state.isAuthenticated = false
        state.currentUser = null
        state.token = null
        
        // Limpiar localStorage en caso de error
        if (typeof window !== 'undefined') {
          localStorage.removeItem('isAuthenticated')
          localStorage.removeItem('currentUser')
        }
      })
      // Fetch all users
      .addCase(fetchAllUsersAsync.pending, (state) => {
        state.loading = true
      })
      .addCase(fetchAllUsersAsync.fulfilled, (state, action) => {
        state.loading = false
        state.users = action.payload
      })
      .addCase(fetchAllUsersAsync.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Update user
      .addCase(updateUserAsync.pending, (state) => {
        state.loading = true
      })
      .addCase(updateUserAsync.fulfilled, (state, action) => {
        state.loading = false
        const index = state.users.findIndex(u => u.id === action.payload.id)
        if (index !== -1) {
          state.users[index] = action.payload
        }
      })
      .addCase(updateUserAsync.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Delete user
      .addCase(deleteUserAsync.pending, (state) => {
        state.loading = true
      })
      .addCase(deleteUserAsync.fulfilled, (state, action) => {
        state.loading = false
        state.users = state.users.filter(u => u.id !== action.payload)
      })
      .addCase(deleteUserAsync.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Create user (admin)
      .addCase(createUserAsync.pending, (state) => {
        state.loading = true
      })
      .addCase(createUserAsync.fulfilled, (state, action) => {
        state.loading = false
        // Agregar el nuevo usuario a la lista sin afectar la sesión actual
        state.users.push(action.payload)
      })
      .addCase(createUserAsync.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
  },
})

export const {
  login,
  logout,
  clearError,
  addUser,
  updateUser,
  deleteUser,
  setLoading,
  setError,
} = authSlice.actions

// Selectors
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated
export const selectCurrentUser = (state: { auth: AuthState }) => state.auth.currentUser
export const selectUsers = (state: { auth: AuthState }) => state.auth.users
export const selectAllUsers = (state: { auth: AuthState }) => state.auth.users // Alias for compatibility
export const selectAuthLoading = (state: { auth: AuthState }) => state.auth.authLoading // Solo loading de auth
export const selectUsersLoading = (state: { auth: AuthState }) => state.auth.loading // Loading general
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error

// Helper function to check permissions
export const hasPermission = (user: User | null, requiredRole: UserRole): boolean => {
  if (!user) return false
  
  const roleHierarchy = {
    'administrador': 3,
    'operaciones': 2,
    'facturacion': 1,
    'pendiente': 0,
  }
  
  // Obtener los roles del usuario (soportar tanto role único como roles múltiples)
  const userRoles: UserRole[] = user.roles || (user.role ? [user.role] : [])
  
  // Verificar si alguno de los roles del usuario cumple con el permiso requerido
  return userRoles.some(role => roleHierarchy[role] >= roleHierarchy[requiredRole])
}

// Helper function to check module access
export const hasModuleAccess = (user: User | null, requiredModule: UserModule): boolean => {
  if (!user) return false
  
  // Obtener los roles del usuario (soportar tanto role único como roles múltiples)
  const userRoles: UserRole[] = user.roles || (user.role ? [user.role] : [])
  
  // Si el usuario es administrador, tiene acceso a todos los módulos
  if (userRoles.includes('administrador')) return true
  return user.modules?.includes(requiredModule) || false
}

// Helper function to check if user can see dashboard
// Only specific user can see dashboard
export const canSeeDashboard = (user: User | null): boolean => {
  if (!user) return false
  // Solo el usuario específico puede ver el dashboard
  return user.email === 'leandrojavier@gmail.com'
}

// Helper function to check section access within a module
// Defines what sections each role can access within each module
export const hasSectionAccess = (user: User | null, module: UserModule, section: string): boolean => {
  if (!user) return false
  
  // Admin has access to everything
  if (user.role === 'administrador') return true
  
  // User must have access to the module first
  if (!hasModuleAccess(user, module)) return false
  
  // Define section permissions by role and module
  const sectionPermissions: Record<UserModule, Record<UserRole, string[]>> = {
    trucking: {
      'administrador': ['upload', 'prefactura', 'gastos-autoridades', 'records', 'config'],
      'operaciones': ['upload'], // Solo subir excel
      'facturacion': ['prefactura', 'gastos-autoridades', 'records'], // Crear prefactura, gastos, facturas
      'pendiente': []
    },
    shipchandler: {
      'administrador': ['upload', 'invoice', 'records', 'historial', 'config'],
      'operaciones': ['upload'], // Solo crear registros
      'facturacion': ['invoice', 'records', 'historial'], // Crear prefactura, facturas, historial
      'pendiente': []
    },
    agency: {
      'administrador': ['services', 'records', 'sap-invoice', 'historial', 'catalogs'], // Config removido - no se usa
      'operaciones': ['services', 'records'], // Crear servicios y registros
      'facturacion': ['sap-invoice', 'historial'], // SAP Invoice e historial (Clientes está en sección global)
      'pendiente': []
    }
  }
  
  const allowedSections = sectionPermissions[module]?.[user.role] || []
  return allowedSections.includes(section)
}

export default authSlice.reducer