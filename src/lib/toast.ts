type Listener = (msg: string) => void;

const listeners = new Set<Listener>();

export function showToast(msg: string) {
  listeners.forEach((l) => l(msg));
}

export function onToast(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
