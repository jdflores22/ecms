import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export interface User {
  id: number
  username: string
  email: string
  fullName: string
  role: string
  profilePhoto?: string | null
  shippingLineId?: number | null
  depotId?: number | null
  allowedPages?: string[]
}

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: User | null
}

const stored = localStorage.getItem('ecms_auth')
const initialState: AuthState = stored
  ? JSON.parse(stored)
  : { accessToken: null, refreshToken: null, user: null }

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ accessToken: string; refreshToken: string; user: User }>,
    ) => {
      state.accessToken = action.payload.accessToken
      state.refreshToken = action.payload.refreshToken
      state.user = action.payload.user
      localStorage.setItem('ecms_auth', JSON.stringify(state))
    },
    logout: (state) => {
      state.accessToken = null
      state.refreshToken = null
      state.user = null
      localStorage.removeItem('ecms_auth')
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (!state.user) return
      state.user = { ...state.user, ...action.payload }
      localStorage.setItem('ecms_auth', JSON.stringify(state))
    },
  },
})

export const { setCredentials, logout, updateUser } = authSlice.actions
export default authSlice.reducer
