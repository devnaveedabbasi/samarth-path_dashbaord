// helper/handleError.ts
import { toast } from "react-hot-toast";
import { isAxiosError, AxiosError } from "axios";

export default function handleError(error: unknown): void {
  console.log(isAxiosError(error));

  if (isAxiosError(error)) {
    if (error.message === "canceled") {
      return;
    }
    if (error.response?.data?.message) {
      toast.error(error.response.data.message);
    } else {
      toast.error(error.message);
    }
  } else if (error instanceof Error) {
    console.error("Error:", error);
    toast.error(error.message);
  } else {
    console.error("Unknown error:", error);
    toast.error("An unexpected error occurred");
  }
}