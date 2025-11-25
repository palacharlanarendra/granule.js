import { createContext, useContext, useMemo, useReducer } from "react";

const BaselineContext = createContext(null);

const initialState = {
  user: { name: "John", age: 22 },
  theme: "dark",
};

function reducer(state, action) {
  switch (action.type) {
    case "incrementAge":
      return { ...state, user: { ...state.user, age: state.user.age + 1 } };
    case "toggleName":
      return {
        ...state,
        user: { ...state.user, name: state.user.name === "John" ? "Jane" : "John" },
      };
    case "toggleTheme":
      return { ...state, theme: state.theme === "dark" ? "light" : "dark" };
    default:
      return state;
  }
}

export function BaselineProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const value = useMemo(() => ({
    state,
    incrementAge: () => dispatch({ type: "incrementAge" }),
    toggleName: () => dispatch({ type: "toggleName" }),
    toggleTheme: () => dispatch({ type: "toggleTheme" }),
  }), [state]);
  return <BaselineContext.Provider value={value}>{children}</BaselineContext.Provider>;
}

export function useBaseline() {
  const ctx = useContext(BaselineContext);
  if (!ctx) throw new Error("useBaseline must be used within BaselineProvider");
  return ctx;
}