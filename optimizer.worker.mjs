// Фоновый поток: полный перебор не блокирует интерфейс.
import { analyzeSpace, reallocate } from "./optimizer.mjs";

self.onmessage = ({ data }) => {
  try {
    if (data.type === "space") {
      const space = analyzeSpace();
      self.postMessage({ id: data.id, result: space }, [space.sorted.buffer]);
    } else if (data.type === "reallocate") {
      self.postMessage({ id: data.id, result: reallocate(data.decisions, data.eventId) });
    }
  } catch (error) {
    self.postMessage({ id: data.id, error: String(error?.message ?? error) });
  }
};
