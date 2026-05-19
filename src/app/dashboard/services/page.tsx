"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import axiosInstance from "@/config/axiosInstance";
import { getConfig } from "@/store/slicer";
import SearchInput from "@/components/ui/SearchInput";
import SummaryCards, { SummaryCardSkeleton } from "@/components/ui/SummaryCards";
import { Icon } from "@iconify/react";
import { CustomDropdown } from "@/components/ui/Dropdown";
import Button from "@/components/ui/Button";
import useDebounce from "@/hooks/useDebounce";
import * as Yup from "yup";
import { DataTable } from "@/components/ui/DataTable";

const serviceSchema = Yup.object({
  name: Yup.string()
    .trim()
    .min(1, "Service Name is required")
    .max(100, "Service Name is too long")
    .required("Service Name is required"),
  categoryId: Yup.string()
    .min(1, "Category is required")
    .required("Category is required"),
price: Yup.string()
  .min(1, "Price is required")
  .test("is-number", "Price must be a valid positive number greater than 0", (val) => {
    if (!val) return false;
    const num = Number(val);
    return !isNaN(num) && num > 0; // Changed from >= 0 to > 0
  })
  .required("Price is required"),
  description: Yup.string()
    .min(10, "Description must be at least 10 characters")
    .max(1000, "Description must not exceed 1000 characters")
    .required("Description is required") // Added required
});
// Types
interface Category {
  _id: string;
  name: string;
  icon?: string;
  isActive?: boolean;
}

interface Service {
  _id: string;
  name: string;
  categoryId: Category | null;
  price: number;
  description?: string;
  icon: string;
  isActive: boolean;
  isDeleted: boolean;
  averageRating: number;
  totalReviews: number;
  createdAt: string;
  updatedAt: string;
}

interface PaginationData {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface SummaryData {
  totalServices: number;
  activeServices: number;
  deletedServices: number;
}

interface QueryState {
  page: number;
  limit: number;
  search: string;
  isActive: string;
  categoryId: string;
  sortBy: string;
  sortOrder: string;
}

function Services() {
  // State
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  const [pagination, setPagination] = useState<PaginationData>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
    hasNextPage: false,
    hasPrevPage: false
  });

  const [queryState, setQueryState] = useState<QueryState>({
    page: 1,
    limit: 10,
    search: "",
    isActive: "",
    categoryId: "",
    sortBy: "createdAt",
    sortOrder: "desc"
  });

  const [searchInput, setSearchInput] = useState("");

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  // Form states
  const [formData, setFormData] = useState({ name: "", categoryId: "", price: "", description: "", icon: null as File | null });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formLoading, setFormLoading] = useState(false);
  const [iconPreview, setIconPreview] = useState<string>("");
  const debouncedSearch = useDebounce(searchInput, 500);

  const clearFormErrors = () => setFormErrors({});
  const clearFieldError = (field: string) => setFormErrors(prev => { const n = { ...prev }; delete n[field]; return n; });

  // Validate form with Yup
  const validateForm = async (data: typeof formData) => {
    try {
      await serviceSchema.validate({
        name: data.name,
        categoryId: data.categoryId,
        price: data.price,
        description: data.description
      }, { abortEarly: false });
      return { isValid: true, errors: {} };
    } catch (error) {
      if (error instanceof Yup.ValidationError) {
        const errors: Record<string, string> = {};
        error.inner.forEach(err => {
          if (err.path) {
            errors[err.path] = err.message;
          }
        });
        return { isValid: false, errors };
      }
      return { isValid: false, errors: {} };
    }
  };

  useEffect(() => {
    setQueryState((prev) => ({
      ...prev,
      search: debouncedSearch,
      page: 1,
    }));
  }, [debouncedSearch]);

  // Fetch categories for dropdowns
  const fetchCategories = useCallback(async () => {
    try {
      // Get active categories to populate dropdowns
      const response = await axiosInstance.get(`/categories?limit=100`, getConfig());
      if (response.data.success) {
        setCategories(response.data.data.categories);
      }
    } catch (error) {
      console.error("Failed to fetch categories", error);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Fetch services
  const fetchServices = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", queryState.page.toString());
      params.append("limit", queryState.limit.toString());
      if (queryState.search) params.append("search", queryState.search);
      if (queryState.isActive) params.append("isActive", queryState.isActive);
      if (queryState.categoryId) params.append("categoryId", queryState.categoryId);
      if (queryState.sortBy) params.append("sortBy", queryState.sortBy);
      if (queryState.sortOrder) params.append("sortOrder", queryState.sortOrder);

      const response = await axiosInstance.get(`/services?${params.toString()}`, getConfig());

      if (response.data.success) {
        setServices(response.data.data.services);
        setPagination(response.data.data.pagination);
        if (response.data.data.summary) {
          setSummaryData(response.data.data.summary);
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to fetch services");
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [queryState]);

  useEffect(() => {
    fetchServices(true);
  }, [fetchServices]);

  // Add service
  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = await validateForm(formData);
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      return;
    }
    clearFormErrors();
    setFormLoading(true);
    try {
      const fd = new FormData();
      fd.append("name", formData.name);
      fd.append("categoryId", formData.categoryId);
      fd.append("price", formData.price);
      fd.append("description", formData.description);
      if (formData.icon) fd.append("icon", formData.icon);
      const response = await axiosInstance.post("/services", fd, { ...getConfig(), headers: { "Content-Type": "multipart/form-data" } });
      if (response.data.success) {
        toast.success("Service created successfully");
        setIsAddModalOpen(false);
        setFormData({ name: "", categoryId: "", price: "", description: "", icon: null });
        setIconPreview("");
        clearFormErrors();
        fetchServices(false);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create service");
    } finally {
      setFormLoading(false);
    }
  };

  // Update service
  const handleUpdateService = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = await validateForm(formData);
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      return;
    }
    clearFormErrors();
    setFormLoading(true);
    try {
      const fd = new FormData();
      fd.append("name", formData.name);
      fd.append("categoryId", formData.categoryId);
      fd.append("price", formData.price);
      fd.append("description", formData.description);
      if (formData.icon) fd.append("icon", formData.icon);
      const response = await axiosInstance.put(`/services/${selectedService?._id}`, fd, { ...getConfig(), headers: { "Content-Type": "multipart/form-data" } });
      if (response.data.success) {
        toast.success("Service updated successfully");
        setIsEditModalOpen(false);
        setFormData({ name: "", categoryId: "", price: "", description: "", icon: null });
        setIconPreview("");
        clearFormErrors();
        fetchServices(false);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update service");
    } finally {
      setFormLoading(false);
    }
  };

  // Delete service
  const handleDeleteService = async () => {
    if (!selectedService) return;

    setFormLoading(true);
    try {
      const response = await axiosInstance.delete(
        `/services/${selectedService._id}/soft`,
        getConfig()
      );

      if (response.data.success) {
        toast.success("Service deleted successfully");
        setIsDeleteModalOpen(false);
        setSelectedService(null);
        fetchServices(false); // Silent fetch
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete service");
    } finally {
      setFormLoading(false);
    }
  };

  // Toggle service status
  const handleToggleStatus = async (service: Service) => {
    // Optimistic UI update
    setServices(prev => prev.map(s => s._id === service._id ? { ...s, isActive: !s.isActive } : s));
    try {
      const response = await axiosInstance.patch(
        `/services/${service._id}/toggle-active`,
        {},
        getConfig()
      );

      if (response.data.success) {
        toast.success(`Service ${!service.isActive ? "activated" : "deactivated"}`);
        fetchServices(false); // Silent fetch
      }
    } catch (error: any) {
      // Revert on error
      setServices(prev => prev.map(s => s._id === service._id ? { ...s, isActive: service.isActive } : s));
      toast.error(error.response?.data?.message || "Failed to update status");
    }
  };

  // Open edit modal
  const openEditModal = (service: Service) => {
    setSelectedService(service);
    setFormData({
      name: service.name,
      categoryId: service.categoryId?._id || "",
      price: service.price.toString(),
      description: service.description || "",
      icon: null
    });
    setIconPreview(`${process.env.NEXT_PUBLIC_API_URL}${service.icon}`);
    clearFormErrors();
    setIsEditModalOpen(true);
  };

  // Handle filter change
  const handleFilterChange = (key: keyof QueryState, value: string | number) => {
    setQueryState(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  // Clear filters
  const handleClearFilters = () => {
    setSearchInput("");
    setQueryState({
      page: 1,
      limit: 10,
      search: "",
      isActive: "",
      categoryId: "",
      sortBy: "createdAt",
      sortOrder: "desc"
    });
  };

  // Summary cards data
  const summaryCards = [
    {
      label: "Total Services",
      value: summaryData?.totalServices || 0,
      icon: "mdi:cog-outline"
    },
    {
      label: "Active Services",
      value: summaryData?.activeServices || 0,
      icon: "mdi:check-circle-outline"
    },
    {
      label: "Categories",
      value: categories.length || 0,
      icon: "mdi:folder-multiple-outline"
    }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-linear-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">Services</h1>
            <p className="text-sm text-gray-500 mt-1">Manage and organize your platform services.</p>
          </div>
          <button
            onClick={() => {
              setFormData({ name: "", categoryId: "", price: "", description: "", icon: null });
              setIconPreview("");
              clearFormErrors();
              setIsAddModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-linear-to-r from-primary-600 to-primary-500 text-white rounded-xl shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 hover:-translate-y-0.5 transition-all duration-300 font-medium w-full sm:w-auto"
          >
            <Icon icon="mdi:plus-thick" className="w-5 h-5" />
            Add Service
          </button>
        </div>

        {/* Summary Cards */}
        <div>
          {loading && !services.length ? (
            <SummaryCardSkeleton />
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <SummaryCards data={summaryCards as any} />
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white/80 backdrop-blur-xl border border-gray-100 shadow-sm rounded-2xl ">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 p-3">
            <div className="lg:col-span-5 w-full">
              <SearchInput
                value={searchInput}
                onChange={setSearchInput}
                placeholder="Search services by name..."
              />
            </div>
            <div className="lg:col-span-3 w-full">
              <CustomDropdown
                icon="mdi:filter-variant"
                placeholder="All Status"
                options={[
                  { value: "", label: "All Status" },
                  { value: "true", label: "Active" },
                  { value: "false", label: "Inactive" }
                ]}
                value={queryState.isActive}
                onChange={(value: string | number | "") => handleFilterChange("isActive", value as string)}
              />
            </div>
            <div className="lg:col-span-3 w-full">
              <CustomDropdown
                icon="mdi:folder-outline"
                placeholder="All Categories"
                searchable={true}
                options={[
                  { value: "", label: "All Categories" },
                  ...categories.map(c => ({ value: c._id, label: c.name }))
                ]}
                value={queryState.categoryId}
                onChange={(value: string | number | "") => handleFilterChange("categoryId", value as string)}
              />
            </div>

            <div className="lg:col-span-1 w-full flex items-end">
              <Button
                onClick={handleClearFilters}
                icon="mdi:filter-remove-outline"
                title="Clear Filters"
                variant="secondary"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white/80 backdrop-blur-xl z-10 border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
          <DataTable
            columns={[
              { key: "name", header: "Service Name", cell: (service: Service) => (
                <div className="flex items-center gap-3 min-w-0">
                  {service.icon && (
                    <Image src={`${process.env.NEXT_PUBLIC_API_URL}${service.icon}`} alt={service.name} width={36} height={36} unoptimized className="object-cover rounded-full w-9 h-9 shrink-0" />
                  )}
                  <div className="flex flex-col leading-tight min-w-0">
                    <span className="text-sm font-semibold text-gray-900 truncate max-w-40">{service.name}</span>
                    <span className="text-xs text-gray-500 truncate max-w-40">{service.categoryId?.name || "N/A"}</span>
                  </div>
                </div>
              ) },
              { key: "price", header: "Price", cell: (service: Service) => <span className="text-sm text-gray-700">${service.price}</span> },
              { key: "averageRating", header: "Rating", cell: (service: Service) => (
                <span className="flex items-center gap-1 text-amber-600 font-semibold">
                  <Icon icon="mdi:star" className="w-4 h-4" />
                  {service.averageRating}
                </span>
              ) },
              { key: "isActive", header: "Status", cell: (service: Service) => (
                <span onClick={() => handleToggleStatus(service)} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer ${service.isActive ? "bg-emerald-50 text-emerald-700 border border-emerald-200/50" : "bg-gray-50 text-gray-600 border border-gray-200/50"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${service.isActive ? "bg-emerald-500" : "bg-gray-400"}`} />
                  {service.isActive ? "Active" : "Inactive"}
                </span>
              ) },
              { key: "actions", header: "Actions", cell: (service: Service) => (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setIsViewModalOpen(true);
                      setSelectedService(service);
                    }} 
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                    title="View Service"
                  >
                    <Icon icon="mdi:eye-outline" className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => openEditModal(service)}
                    className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all"
                    title="Edit Service"
                  >
                    <Icon icon="mdi:pencil-outline" className="w-5 h-5" />
                  </button>
                
                  <button
                    onClick={() => {
                      setIsDeleteModalOpen(true);
                      setSelectedService(service);
                    }}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                    title="Delete Service"
                  >
                    <Icon icon="mdi:trash-can-outline" className="w-5 h-5" />
                  </button>
                </div>
              ) },
            ]}
            data={services}
            loading={loading}
            pagination={pagination}
            onPageChange={(page) => setQueryState((p) => ({ ...p, page }))}
            emptyTitle="No services found"
            emptyDescription="Try adjusting your search or filters."
            emptyIcon="mdi:account-search-outline"
          />
        </div>
      </div>

      {/* ─── MODALS ─── */}

      {/* Add Service Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-gray-900">Add Service</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <Icon icon="mdi:close" className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleAddService} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Service Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => { setFormData({ ...formData, name: e.target.value }); clearFieldError("name"); }}
                  placeholder="e.g. Deep Cleaning"
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all bg-gray-50/50 focus:bg-white ${formErrors.name ? "border-red-400 focus:ring-red-500/20 focus:border-red-500" : "border-gray-200 focus:ring-primary-500/20 focus:border-primary-500"
                    }`}
                />
                {formErrors.name && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-red-500">
                    <Icon icon="mdi:alert-circle-outline" className="w-3.5 h-3.5" />{formErrors.name}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <div className={formErrors.categoryId ? "[&_button]:border-red-400" : ""}>
                    <CustomDropdown
                      icon="mdi:folder-outline"
                      placeholder="Select Category"
                      searchable={true}
                      options={[
                        { value: "", label: "Select Category" },
                        ...categories.map(c => ({ value: c._id, label: c.name }))
                      ]}
                      value={formData.categoryId}
                      onChange={(value: string | number | "") => { setFormData({ ...formData, categoryId: value as string }); clearFieldError("categoryId"); }}
                    />
                  </div>
                  {formErrors.categoryId && (
                    <p className="mt-1.5 flex items-center gap-1 text-xs text-red-500">
                      <Icon icon="mdi:alert-circle-outline" className="w-3.5 h-3.5" />{formErrors.categoryId}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Price ($) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.price}
                    onChange={(e) => { setFormData({ ...formData, price: e.target.value }); clearFieldError("price"); }}
                    placeholder="e.g. 50"
                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all bg-gray-50/50 focus:bg-white ${formErrors.price ? "border-red-400 focus:ring-red-500/20 focus:border-red-500" : "border-gray-200 focus:ring-primary-500/20 focus:border-primary-500"
                      }`}
                  />
                  {formErrors.price && (
                    <p className="mt-1.5 flex items-center gap-1 text-xs text-red-500">
                      <Icon icon="mdi:alert-circle-outline" className="w-3.5 h-3.5" />{formErrors.price}
                    </p>
                  )}
                </div>
              </div>

<div>
  <label className="block text-sm font-semibold text-gray-700 mb-2">
    Description <span className="text-red-500">*</span>
    <span className="text-xs text-gray-400 ml-2">
      (Min 10, Max 1000 characters)
    </span>
  </label>
  <textarea
    value={formData.description}
    onChange={(e) => { 
      setFormData({ ...formData, description: e.target.value }); 
      clearFieldError("description"); 
    }}
    placeholder="Brief description of the service..."
    rows={3}
    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all bg-gray-50/50 focus:bg-white ${
      formErrors.description ? "border-red-400 focus:ring-red-500/20 focus:border-red-500" : "border-gray-200 focus:ring-primary-500/20 focus:border-primary-500"
    }`}
  />
  {formErrors.description && (
    <p className="mt-1.5 flex items-center gap-1 text-xs text-red-500">
      <Icon icon="mdi:alert-circle-outline" className="w-3.5 h-3.5" />
      {formErrors.description}
    </p>
  )}
  {!formErrors.description && formData.description && (
    <p className={`mt-1.5 text-xs ${formData.description.length < 10 ? 'text-red-500' : 'text-green-500'}`}>
      {formData.description.length}/1000 characters 
      {formData.description.length < 10 && ` (Need ${10 - formData.description.length} more characters)`}
    </p>
  )}
</div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Service Icon</label>
                <div className="flex gap-4">
                  {iconPreview ? (
                    <div className="relative w-24 h-24 bg-gray-50 rounded-xl border border-gray-100 overflow-hidden group">
                      <Image src={iconPreview} alt="Preview" unoptimized fill className="object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, icon: null });
                          setIconPreview("");
                        }}
                        className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Icon icon="mdi:trash-can-outline" className="w-6 h-6 text-white" />
                      </button>
                    </div>
                  ) : (
                    <label className="w-full flex flex-col items-center justify-center px-4 py-8 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-primary-400 hover:bg-primary-50/50 transition-all group">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setFormData({ ...formData, icon: file });
                            const reader = new FileReader();
                            reader.onload = (e) => setIconPreview(e.target?.result as string);
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden"
                      />
                      <Icon icon="mdi:cloud-upload-outline" className="w-8 h-8 text-gray-400 group-hover:text-primary-500 mb-2 transition-colors" />
                      <p className="text-sm font-medium text-gray-700">Click to upload icon</p>
                    </label>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-6 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 font-semibold shadow-lg shadow-primary-500/30 transition-all disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {formLoading ? (
                    <><Icon icon="mdi:loading" className="w-5 h-5 animate-spin" /> Creating...</>
                  ) : "Create Service"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Service Modal */}
      {isEditModalOpen && selectedService && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-gray-900">Edit Service</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <Icon icon="mdi:close" className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleUpdateService} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Service Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => { setFormData({ ...formData, name: e.target.value }); clearFieldError("name"); }}
                  placeholder="e.g. Deep Cleaning"
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all bg-gray-50/50 focus:bg-white ${formErrors.name ? "border-red-400 focus:ring-red-500/20 focus:border-red-500" : "border-gray-200 focus:ring-primary-500/20 focus:border-primary-500"
                    }`}
                />
                {formErrors.name && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-red-500">
                    <Icon icon="mdi:alert-circle-outline" className="w-3.5 h-3.5" />{formErrors.name}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <div className={formErrors.categoryId ? "[&_button]:border-red-400" : ""}>
                    <CustomDropdown
                      icon="mdi:folder-outline"
                      placeholder="Select Category"
                      searchable={true}
                      options={[
                        { value: "", label: "Select Category" },
                        ...categories.map(c => ({ value: c._id, label: c.name }))
                      ]}
                      value={formData.categoryId}
                      onChange={(value: string | number | "") => { setFormData({ ...formData, categoryId: value as string }); clearFieldError("categoryId"); }}
                    />
                  </div>
                  {formErrors.categoryId && (
                    <p className="mt-1.5 flex items-center gap-1 text-xs text-red-500">
                      <Icon icon="mdi:alert-circle-outline" className="w-3.5 h-3.5" />{formErrors.categoryId}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Price ($) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.price}
                    onChange={(e) => { setFormData({ ...formData, price: e.target.value }); clearFieldError("price"); }}
                    placeholder="e.g. 50"
                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all bg-gray-50/50 focus:bg-white ${formErrors.price ? "border-red-400 focus:ring-red-500/20 focus:border-red-500" : "border-gray-200 focus:ring-primary-500/20 focus:border-primary-500"
                      }`}
                  />
                  {formErrors.price && (
                    <p className="mt-1.5 flex items-center gap-1 text-xs text-red-500">
                      <Icon icon="mdi:alert-circle-outline" className="w-3.5 h-3.5" />{formErrors.price}
                    </p>
                  )}
                </div>
              </div>
<div>
  <label className="block text-sm font-semibold text-gray-700 mb-2">
    Descriptions <span className="text-red-500">*</span>
    <span className="text-xs text-gray-400 ml-2">
      (Min 10, Max 1000 characters)
    </span>
  </label>
  <textarea
    value={formData.description}
    onChange={(e) => { 
      setFormData({ ...formData, description: e.target.value }); 
      clearFieldError("description"); 
    }}
    placeholder="Brief description of the service..."
    rows={3}
    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all bg-gray-50/50 focus:bg-white ${
      formErrors.description ? "border-red-400 focus:ring-red-500/20 focus:border-red-500" : "border-gray-200 focus:ring-primary-500/20 focus:border-primary-500"
    }`}
  />
  {formErrors.description && (
    <p className="mt-1.5 flex items-center gap-1 text-xs text-red-500">
      <Icon icon="mdi:alert-circle-outline" className="w-3.5 h-3.5" />
      {formErrors.description}
    </p>
  )}
  {!formErrors.description && formData.description && (
    <p className={`mt-1.5 text-xs ${formData.description.length < 10 ? 'text-red-500' : 'text-green-500'}`}>
      {formData.description.length}/1000 characters 
      {formData.description.length < 10 && ` (Need ${10 - formData.description.length} more characters)`}
    </p>
  )}
</div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Service Icon</label>
                <div className="flex gap-4">
                  {iconPreview ? (
                    <div className="relative w-24 h-24 bg-gray-50 rounded-xl border border-gray-100 overflow-hidden group">
                      <Image src={iconPreview} alt="Preview" unoptimized fill className="object-cover" />
                      <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setFormData({ ...formData, icon: file });
                              const reader = new FileReader();
                              reader.onload = (e) => setIconPreview(e.target?.result as string);
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="hidden"
                        />
                        <Icon icon="mdi:pencil-outline" className="w-6 h-6 text-white" />
                      </label>
                    </div>
                  ) : (
                    <label className="w-full flex flex-col items-center justify-center px-4 py-8 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-primary-400 hover:bg-primary-50/50 transition-all group">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setFormData({ ...formData, icon: file });
                            const reader = new FileReader();
                            reader.onload = (e) => setIconPreview(e.target?.result as string);
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden"
                      />
                      <Icon icon="mdi:cloud-upload-outline" className="w-8 h-8 text-gray-400 group-hover:text-primary-500 mb-2 transition-colors" />
                      <p className="text-sm font-medium text-gray-700">Click to upload icon</p>
                    </label>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-6 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 font-semibold shadow-lg shadow-primary-500/30 transition-all disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {formLoading ? (
                    <><Icon icon="mdi:loading" className="w-5 h-5 animate-spin" /> Updating...</>
                  ) : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Service Modal */}
      {isViewModalOpen && selectedService && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="h-24 bg-linear-to-r from-primary-500 to-primary-600 relative">
              <button onClick={() => setIsViewModalOpen(false)} className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors">
                <Icon icon="mdi:close" className="w-6 h-6" />
              </button>
            </div>

            <div className="px-6 pb-6 relative">
              <div className="absolute -top-12 left-6 w-24 h-24 bg-white rounded-2xl p-2 shadow-lg">
                <div className="w-full h-full bg-gray-50 rounded-xl overflow-hidden relative">
                  {selectedService.icon ? (
                    <Image
                      src={`${process.env.NEXT_PUBLIC_API_URL}${selectedService.icon}`}
                      alt={selectedService.name}
                      unoptimized
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Icon icon="mdi:image-outline" className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-16 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedService.name}</h2>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${selectedService.isActive
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200/50"
                        : "bg-gray-50 text-gray-600 border border-gray-200/50"
                        }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${selectedService.isActive ? "bg-emerald-500" : "bg-gray-400"}`} />
                      {selectedService.isActive ? "Active" : "Inactive"}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200/50">
                      <Icon icon="mdi:folder-outline" className="w-3 h-3" />
                      {selectedService.categoryId?.name || "N/A"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Price</p>
                    <p className="text-2xl font-bold text-gray-900">${selectedService.price}</p>
                  </div>
                  <div className="bg-amber-50/50 rounded-xl p-4 border border-amber-100">
                    <p className="text-xs font-semibold text-amber-600/70 uppercase tracking-wider mb-1">Rating</p>
                    <div className="flex items-center gap-1">
                      <Icon icon="mdi:star" className="w-5 h-5 text-amber-500" />
                      <p className="text-2xl font-bold text-amber-700">{selectedService.averageRating}</p>
                    </div>
                    <p className="text-xs text-amber-600 mt-1">Based on {selectedService.totalReviews} reviews</p>
                  </div>
                </div>

                {selectedService.description && (
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Description</p>
                    <p className="text-sm text-gray-700">{selectedService.description}</p>
                  </div>
                )}

                <div className="flex justify-between items-center text-sm text-gray-500 border-t border-gray-100 pt-4">
                  <span>Created: {new Date(selectedService.createdAt).toLocaleDateString("en-GB")}</span>
                  <span>Updated: {new Date(selectedService.updatedAt).toLocaleDateString("en-GB")}</span>
                </div>

                <button
                  onClick={() => setIsViewModalOpen(false)}
                  className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-semibold transition-colors"
                >
                  Close Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedService && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="w-16 h-16 rounded-full bg-red-50 border-[6px] border-red-50 flex items-center justify-center mx-auto mb-4">
                <Icon icon="mdi:alert-outline" className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">Delete Service?</h2>
              <p className="text-center text-gray-500 mb-8">
                You're about to delete <span className="font-semibold text-gray-900">"{selectedService.name}"</span>.
                This action cannot be undone and will prevent future bookings for this service.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteService}
                  disabled={formLoading}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 font-semibold shadow-lg shadow-red-500/30 transition-all disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {formLoading ? (
                    <><Icon icon="mdi:loading" className="w-5 h-5 animate-spin" /> Deleting...</>
                  ) : "Yes, Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Services;