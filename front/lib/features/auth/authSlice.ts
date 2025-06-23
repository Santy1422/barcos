import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'

export type UserRole = 'administrador' | 'operaciones' | 'facturacion'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  createdAt: string
}

interface AuthState {
  isAuthenticated: boolean
  currentUser: User | null
  users: User[]
  loading: boolean
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
    
    if (token && isAuthenticated && currentUser) {
      return {
        ...initialState,
        isAuthenticated: true,
        token,
        currentUser: JSON.parse(currentUser)
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
        throw new Error(errorData.error || 'Error en el login')
      }
      
      const data = await response.json()
      
      // Guardar token en localStorage
      localStorage.setItem('token', data.token)
      
      // Guardar cookie para middleware
      document.cookie = `auth-token=true; path=/`
      
      return {
        user: data.user,
        token: data.token
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
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('No token found')
      }
      
      const response = await fetch('/api/user/reloadUser', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        throw new Error('Token inválido')
      }
      
      const data = await response.json()
      
      return {
        user: data.user,
        token: token
      }
    } catch (error: any) {
      // Limpiar datos inválidos
      localStorage.removeItem('token')
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
    role = 'administrador',
    modules = ['trucking', 'shipchandler', 'agency']
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
        throw new Error(errorData.error || 'Error en el registro')
      }
      
      const data = await response.json()
      
      // Guardar token en localStorage
      localStorage.setItem('token', data.token)
      
      // Guardar cookie para middleware
      document.cookie = `auth-token=true; path=/`
      
      return {
        user: {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          role: data.user.role,
          createdAt: data.user.createdAt || new Date().toISOString()
        },
        token: data.token
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Error de conexión')
    }
  }
)

const authSlice = createSlice({
  name: 'auth',
  initialState,
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
        state.error = null
      })
      .addCase(registerAsync.fulfilled, (state, action) => {
        state.loading = false
        state.isAuthenticated = true
        state.currentUser = action.payload.user
        state.token = action.payload.token
        state.error = null
      })
      .addCase(registerAsync.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      // Login async
      .addCase(loginAsync.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loginAsync.fulfilled, (state, action) => {
        state.loading = false
        state.isAuthenticated = true
        state.currentUser = action.payload.user
        state.token = action.payload.token
        state.error = null
      })
      .addCase(loginAsync.rejected, (state, action) => {
        state.loading = false
        state.isAuthenticated = false
        state.currentUser = null
        state.token = null
        state.error = action.payload as string
      })
      // Logout async
      .addCase(logoutAsync.fulfilled, (state) => {
        state.loading = false
        state.isAuthenticated = false
        state.currentUser = null
        state.token = null
        state.error = null
      })
      // Verify token
      .addCase(verifyToken.pending, (state) => {
        state.loading = true
      })
      .addCase(verifyToken.fulfilled, (state, action) => {
        state.loading = false
        state.isAuthenticated = true
        state.currentUser = action.payload.user
        state.token = action.payload.token
      })
      .addCase(verifyToken.rejected, (state) => {
        state.loading = false
        state.isAuthenticated = false
        state.currentUser = null
        state.token = null
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
export const selectAuthLoading = (state: { auth: AuthState }) => state.auth.loading
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error

// Helper function to check permissions
export const hasPermission = (user: User | null, requiredRole: UserRole): boolean => {
  if (!user) return false
  
  const roleHierarchy = {
    'administrador': 3,
    'operaciones': 2,
    'facturacion': 1,
  }
  
  return roleHierarchy[user.role] >= roleHierarchy[requiredRole]
}

export default authSlice.reducer