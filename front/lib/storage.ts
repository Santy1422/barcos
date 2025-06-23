import type { RootState } from './store'

// Esta función carga solo el estado de auth desde localStorage
export const loadState = (): Partial<RootState> | undefined => {
  try {
    const serializedState = localStorage.getItem("appState")
    if (serializedState === null) {
      return undefined
    }
    const state = JSON.parse(serializedState)
    // Solo retornar el estado de auth para evitar problemas de hidratación
    return {
      auth: state.auth
    }
  } catch (err) {
    console.error("Could not load state from localStorage", err)
    return undefined
  }
}

// Esta función guarda solo el estado necesario en localStorage
export const saveState = (state: Partial<RootState>) => {
  try {
    const serializedState = JSON.stringify(state)
    localStorage.setItem("appState", serializedState)
  } catch (err) {
    console.error("Could not save state to localStorage", err)
  }
}
