import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost/",
});

const { window } = dom;

globalThis.window = window as unknown as typeof globalThis.window;
globalThis.document = window.document;
Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  value: window.navigator,
});
globalThis.HTMLElement = window.HTMLElement;
globalThis.Element = window.Element;
globalThis.Node = window.Node;
globalThis.Event = window.Event;
globalThis.MouseEvent = window.MouseEvent;
globalThis.KeyboardEvent = window.KeyboardEvent;
globalThis.CustomEvent = window.CustomEvent;
globalThis.getComputedStyle = window.getComputedStyle.bind(window);
globalThis.MutationObserver = window.MutationObserver;
globalThis.requestAnimationFrame = (callback: FrameRequestCallback) =>
  window.setTimeout(() => callback(Date.now()), 16);
globalThis.cancelAnimationFrame = (handle: number) => window.clearTimeout(handle);
