import { useDispatch, useSelector, type TypedUseSelectorHook } from "react-redux"
import type { RootState, AppDispatch } from "./store"

// Usa estos hooks tipados en toda tu aplicación en lugar de `useDispatch` y `useSelector` planos de React-Redux
export const useAppDispatch: () => AppDispatch = useDispatch
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector
