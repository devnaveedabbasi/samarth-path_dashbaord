import { useState } from "react";

type LoadingState = {
  [key: string]: boolean;
};

export const useMultiLoading = () => {
  const [multiLoading, setMultiLoading] = useState<LoadingState>({});

  const start = (key: string) => {
    setMultiLoading((prev) => ({
      ...prev,
      [key]: true,
    }));
  };

  const stop = (key: string) => {
    setMultiLoading((prev) => ({
      ...prev,
      [key]: false,
    }));
  };

  const isLoading = (key: string) => !!multiLoading[key];

  return { start, stop, isLoading };
};