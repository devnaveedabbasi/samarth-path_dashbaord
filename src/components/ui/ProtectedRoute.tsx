"use client";

import { ReactNode, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { userDetails, logout } from "@/store/slices/auth";
import Loader from "@/components/ui/Loader";

type Props = {
  children: ReactNode;
  allowedRoles?: string[]; 
};

export default function ProtectedRoute({ children, allowedRoles }: Props) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { token, userDetails: user, loading } = useAppSelector((state) => state.auth);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const hasFetched = useRef(false);

  //  Listen for unauthorized event from axios
  useEffect(() => {
    const handleUnauthorized = () => {
      localStorage.removeItem("token");
      dispatch(logout());
      router.replace("/auth/login");
    };

    
    window.addEventListener("unauthorized", handleUnauthorized);
    return () => window.removeEventListener("unauthorized", handleUnauthorized);
  }, [dispatch, router]);

  //  Main auth check
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem("token");
      
      // Case 1: No token at all
      if (!storedToken && !token) {
        router.replace("/auth/login");
        return;
      }

      // Case 2: Token exists but no user data
      if ((storedToken || token) && !user && !loading && !hasFetched.current) {
        hasFetched.current = true;
        try {
          await dispatch(userDetails()).unwrap();
        } catch (error) {
          // Failed to fetch user - token invalid
          localStorage.removeItem("token");
          dispatch(logout());
          router.replace("/auth/login");
          return;
        }
      }

      // Case 3: User data loaded, check role permissions
      if (user && !loading) {
        // Check role-based access
        if (allowedRoles && allowedRoles.length > 0) {
          if (!allowedRoles.includes(user.role)) {
            router.replace("/dashboard/unauthorized");
            return;
          }
        }
        setIsAuthorized(true);
      }
    };

    checkAuth();
  }, [token, user, loading, dispatch, router, allowedRoles]);

  console.log("loading", loading);
  

  // Show loading screen
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader loading={loading} title="Loading" />
      </div>
    );
  }

  return <>{children}</>;
}