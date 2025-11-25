import { createStore } from "../../../dist/index.js";

export const store = createStore({
  user: { name: "John", age: 22 },
  theme: "dark",
});