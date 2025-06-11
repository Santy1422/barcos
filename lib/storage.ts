import type { RootState } from "./store"

// This function loads the state from localStorage.
export const loadState = (): RootState | undefined => {
  // We use a try-catch block in case localStorage is not available.
  try {
    const serializedState = localStorage.getItem("appState")
    if (serializedState === null) {
      return undefined // No state found
    }
    return JSON.parse(serializedState)
  } catch (err) {
    console.error("Could not load state from localStorage", err)
    return undefined
  }
}

// This function saves the state to localStorage.
export const saveState = (state: Partial<RootState>) => {
  try {
    const serializedState = JSON.stringify(state)
    localStorage.setItem("appState", serializedState)
  } catch (err) {
    console.error("Could not save state to localStorage", err)
  }
}
