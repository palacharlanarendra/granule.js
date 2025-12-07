import { createContext, useContext, useMemo, useState } from "react";

type BaselineState = {
  user: { name: string; age: number };
  theme: "dark" | "light" | string;
};

type BaselineContextValue = {
  state: BaselineState;
  incrementAge: () => void;
  toggleName: () => void;
  toggleTheme: () => void;
};

const Ctx = createContext<BaselineContextValue | null>(null);

export function BaselineProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<BaselineState>({ user: { name: "John", age: 22 }, theme: "dark" });
  const value = useMemo<BaselineContextValue>(() => ({
    state,
    incrementAge: () => setState(s => ({ ...s, user: { ...s.user, age: s.user.age + 1 } })),
    toggleName: () => setState(s => ({ ...s, user: { ...s.user, name: s.user.name === "John" ? "Jane" : "John" } })),
    toggleTheme: () => setState(s => ({ ...s, theme: s.theme === "dark" ? "light" : "dark" })),
  }), [state]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBaseline() {
  const v = useContext(Ctx);
  if (!v) throw new Error("BaselineProvider missing");
  return v;
}
