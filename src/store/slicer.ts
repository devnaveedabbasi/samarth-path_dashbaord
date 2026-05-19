import { createSlice } from "@reduxjs/toolkit";

export const baseUrl = process.env.NEXT_PUBLIC_API_URL+'/api/admin';
export const baseUrlImg = process.env.NEXT_PUBLIC_API_URL;


  
export const getConfig = () => ({
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  },
});

export const getConfigFormData = () => ({
  headers: {
    "Content-Type": "multipart/form-data",
    Accept: "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  },
});

const initialState = {
  isLoading: false,
  isError: false,
};

const Slicer = createSlice({
  name: "slicer",

  initialState,
  reducers: {},
});
export const {} = Slicer.actions;
export default Slicer.reducer;
