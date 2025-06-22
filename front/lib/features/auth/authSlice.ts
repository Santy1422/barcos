import { createSlice, PayloadAction } from '@reduxjs/toolkit'

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
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    login: (state, action: PayloadAction<{ email: string; password: string }>) => {
      const { email } = action.payload
      const user = state.users.find(u => u.email === email)
      if (user) {
        state.isAuthenticated = true
        state.currentUser = user
        state.error = null
      } else {
        state.error = 'Credenciales inválidas'
      }
    },
    logout: (state) => {
      state.isAuthenticated = false
      state.currentUser = null
    },
    addUser: (state, action: PayloadAction<Omit<User, 'id' | 'createdAt'>>) => {
      const newUser: User = {
        ...action.payload,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
      }
      state.users.push(newUser)
    },
    updateUser: (state, action: PayloadAction<User>) => {
      const index = state.users.findIndex(u => u.id === action.payload.id)
      if (index !== -1) {
        state.users[index] = action.payload
      }
    },
    deleteUser: (state, action: PayloadAction<string>) => {
      state.users = state.users.filter(u => u.id !== action.payload)
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    },
  },
})

export const {
  login,
  logout,
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

// Permission helper
export const hasPermission = (userRole: UserRole, requiredRole: UserRole): boolean => {
  const roleHierarchy = {
    'administrador': 3,
    'operaciones': 2,
    'facturacion': 1,
  }
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
}

export default authSlice.reducer