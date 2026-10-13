import React from "react";
import {
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Loading from "../UI/Loading";

export default function PublicRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Loading
        fullScreen
        label="Loading..."
      />
    );
  }

  if (user) {
    const redirectPath =
      location.state?.from?.pathname ||
      "/dashboard";

    return (
      <Navigate
        to={redirectPath}
        replace
      />
    );
  }

  return <Outlet />;
}