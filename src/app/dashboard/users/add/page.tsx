"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import toast from "react-hot-toast";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as Yup from "yup";
import axiosInstance from "@/config/axiosInstance";
import { getConfig } from "@/store/slicer";
import Button from "@/components/ui/Button";
import InputField from "@/components/ui/InputFeild";
import { CustomDropdown } from "@/components/ui/Dropdown";

const phoneRegex = /^(?:\+91|91|0)?[6-9]\d{9}$/;

const schema = Yup.object({
  name: Yup.string().trim().min(2, "Min 2 characters").max(100, "Max 100 characters").required("Full name is required"),
  email: Yup.string().trim().email("Invalid email address").required("Email is required"),
  phone: Yup.string().trim().matches(phoneRegex, "Enter a valid Indian mobile number").required("Phone number is required"),
  password: Yup.string().min(8, "Min 8 characters").required("Password is required"),
  address: Yup.string().trim().max(300, "Max 300 characters").default(""),
  role: Yup.string().oneOf(["user", "admin"]).required("Role is required"),
});

type FormValues = Yup.InferType<typeof schema>;

const ROLE_OPTIONS = [
  { value: "user", label: "User" },
  { value: "admin", label: "Admin" },
];

export default function AddUserPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: yupResolver(schema),
    defaultValues: { role: "user", address: "" },
  });

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      const response = await axiosInstance.post("/users", values, getConfig());
      if (response.data.success) {
        toast.success("User created successfully!");
        router.push("/dashboard/users");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm"
          >
            <Icon icon="mdi:arrow-left" className="w-6 h-6 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Add User</h1>
            <p className="text-sm text-gray-500">Create a new user account directly from the admin dashboard.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <InputField
                label="Full Name"
                placeholder="Enter full name"
                required
                error={errors.name?.message}
                {...register("name")}
              />
              <InputField
                label="Email Address"
                type="email"
                placeholder="you@example.com"
                required
                error={errors.email?.message}
                {...register("email")}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <InputField
                label="Phone Number"
                placeholder="9876543210"
                required
                error={errors.phone?.message}
                {...register("phone")}
              />
              <InputField
                label="Password"
                type="password"
                placeholder="Min 8 characters"
                required
                error={errors.password?.message}
                {...register("password")}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-sm font-semibold text-gray-700 tracking-wide">
                  Role<span className="text-orange-500 ml-1">*</span>
                </label>
                <Controller
                  name="role"
                  control={control}
                  render={({ field }) => (
                    <CustomDropdown
                      icon="mdi:shield-account-outline"
                      options={ROLE_OPTIONS}
                      value={field.value}
                      onChange={(val) => field.onChange(String(val))}
                    />
                  )}
                />
                {errors.role && <p className="text-xs text-red-500 mt-0.5">{errors.role.message}</p>}
              </div>
              <InputField
                label="Address"
                placeholder="Optional address"
                error={errors.address?.message}
                {...register("address")}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button variant="secondary" type="button" onClick={() => router.back()} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" loading={loading} icon="mdi:account-plus-outline">
              Create User
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
