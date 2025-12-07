import { createStore } from "granule-js";

export type AppState = {
  user: { name: string; age: number };
  theme: string;
};

export const store = createStore<AppState>({
  user: { name: "John", age: 22 },
  theme: "dark",
});
