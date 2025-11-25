import { describe, it, expect, vi } from "vitest";
import { createStore } from "../src/core/store";
import { createReadTracker } from "../src/core/proxy";

describe("store granular subscriptions", () => {
  it("notifies only paths that change", () => {
    const store = createStore({ user: { name: "John", age: 22 }, theme: "dark" });
    const listener = vi.fn();
    const id = Symbol("test");
    store.subscribeComponent(id, listener);
    store.updateComponentPaths(id, new Set(["user.name"]));

    store.set((s) => {
      s.user.age = 23; // different path
    });
    expect(listener).not.toHaveBeenCalled();

    store.set((s) => {
      s.user.name = "Jane";
    });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("read tracker collects primitive leaf paths", () => {
    const obj = { a: { b: 1 }, arr: [1,2,3], theme: "dark" };
    const { proxy, getPaths } = createReadTracker(obj);
    // simulate selector
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const result = proxy.a.b + proxy.arr.length;
    expect(Array.from(getPaths()).sort()).toEqual(["a.b", "arr.length"].sort());
  });
});