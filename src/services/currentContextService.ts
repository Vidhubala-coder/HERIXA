import { MonumentChatContext } from './assistantService';

let activeMonumentContext: MonumentChatContext | undefined = undefined;
const listeners = new Set<(context: MonumentChatContext | undefined) => void>();

export const setCurrentMonumentContext = (context: MonumentChatContext | undefined) => {
  activeMonumentContext = context;
  listeners.forEach(listener => listener(context));
};

export const getCurrentMonumentContext = (): MonumentChatContext | undefined => {
  return activeMonumentContext;
};

export const subscribeToCurrentMonumentContext = (listener: (context: MonumentChatContext | undefined) => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
