import { createStore } from "granule-js";

export const store = createStore({
  user: { name: "John", age: 22 },
  theme: "dark",
});
